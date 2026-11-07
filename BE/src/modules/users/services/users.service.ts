import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { Repository } from "typeorm";
import {
  CommunityUserEntity,
  UserStatus,
} from "../models/community-user.entity";
import {
  LoginUserDto,
  QueryUserDto,
  RegisterUserDto,
} from "../dtos/update-user-status.dto";
import { RealtimeService } from "../../realtime/services/realtime.service";

function hashPassword(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function buildInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function sanitizeUser(user: CommunityUserEntity) {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(CommunityUserEntity)
    private readonly userRepo: Repository<CommunityUserEntity>,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  async register(dto: RegisterUserDto) {
    const emailClean = dto.email.trim().toLowerCase();
    const phoneClean = dto.phone.trim();
    const phoneDigits = phoneClean.replace(/\s+/g, "");

    const allUsers = await this.userRepo.find();
    const duplicate = allUsers.find(
      (u) =>
        u.email.toLowerCase() === emailClean ||
        u.phone.replace(/\s+/g, "") === phoneDigits,
    );
    if (duplicate) {
      throw new ConflictException(
        "Email hoặc Số điện thoại này đã được đăng ký trên hệ thống!",
      );
    }

    let id = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    while (allUsers.some((u) => u.id === id)) {
      id = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const joinedAt = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());

    const newUser = this.userRepo.create({
      id,
      name: dto.name.trim(),
      initials: buildInitials(dto.name),
      phone: phoneClean,
      email: emailClean,
      district: dto.district.trim(),
      joinedAt,
      lastActive: "Vừa xong",
      reports: 0,
      verifiedReports: 0,
      rejectedReports: 0,
      trustScore: 85,
      status: "active",
      identityVerified: true,
      warnings: 0,
      passwordHash: hashPassword(dto.password),
    });

    const saved = await this.userRepo.save(newUser);
    const safeUser = sanitizeUser(saved);

    this.realtimeService?.broadcast("user.updated", {
      action: "registered",
      user: safeUser,
    });

    const token = Buffer.from(
      `${saved.id}:${saved.email}:${Date.now()}`,
    ).toString("base64");

    return {
      message: "Đăng ký tài khoản thành công!",
      token,
      user: safeUser,
    };
  }

  async login(dto: LoginUserDto) {
    const rawId = dto.identifier.trim().toLowerCase();
    const idDigits = rawId.replace(/\s+/g, "");

    const allUsers = await this.userRepo.find();
    const user = allUsers.find(
      (u) =>
        u.email.toLowerCase() === rawId ||
        u.phone.replace(/\s+/g, "") === idDigits ||
        u.id.toLowerCase() === rawId,
    );

    if (!user) {
      throw new UnauthorizedException(
        "Không tìm thấy tài khoản với Email hoặc Số điện thoại này.",
      );
    }

    const incomingHash = hashPassword(dto.password);
    if (user.passwordHash) {
      if (user.passwordHash !== incomingHash) {
        throw new UnauthorizedException("Mật khẩu không chính xác.");
      }
    } else {
      // Tài khoản cộng đồng có sẵn trong DB dùng mật khẩu mặc định 123456
      if (dto.password !== "123456") {
        throw new UnauthorizedException(
          "Mật khẩu không chính xác (tài khoản mẫu dùng mật khẩu mặc định: 123456).",
        );
      }
      user.passwordHash = incomingHash;
    }

    if (user.status === "blocked") {
      throw new ForbiddenException(
        "Tài khoản của bạn đã bị khóa bởi Trung tâm điều hành.",
      );
    }

    user.lastActive = "Vừa xong";
    const saved = await this.userRepo.save(user);
    const safeUser = sanitizeUser(saved);

    this.realtimeService?.broadcast("user.updated", {
      action: "login",
      user: safeUser,
    });

    const token = Buffer.from(
      `${saved.id}:${saved.email}:${Date.now()}`,
    ).toString("base64");

    return {
      message: "Đăng nhập thành công!",
      token,
      user: safeUser,
    };
  }

  async findAll(query: QueryUserDto): Promise<CommunityUserEntity[]> {
    const users = await this.userRepo.find({
      order: { trustScore: "DESC" },
    });

    return users
      .filter((user) => {
        if (query.status && user.status !== query.status) return false;
        if (query.district && user.district !== query.district) return false;
        if (query.search) {
          const kw = query.search.toLowerCase();
          const match =
            user.name.toLowerCase().includes(kw) ||
            user.id.toLowerCase().includes(kw) ||
            user.email.toLowerCase().includes(kw) ||
            user.district.toLowerCase().includes(kw);
          if (!match) return false;
        }
        return true;
      })
      .map((u) => sanitizeUser(u) as CommunityUserEntity);
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng ${id}`);
    }
    const approvalRate = Math.round(
      (user.verifiedReports / Math.max(user.reports, 1)) * 100,
    );
    return {
      ...sanitizeUser(user),
      approvalRate,
    };
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng ${id}`);
    }
    user.status = status;
    const saved = await this.userRepo.save(user);
    const safeUser = sanitizeUser(saved);

    this.realtimeService?.broadcast("user.updated", {
      action: "status_changed",
      user: safeUser,
    });

    const message =
      status === "blocked"
        ? `Đã khóa tài khoản ${id}.`
        : status === "review"
          ? `Đã chuyển ${id} vào danh sách xem xét.`
          : `Đã mở khóa tài khoản ${id}.`;

    return {
      message,
      user: safeUser,
    };
  }

  async generateCsvContent(): Promise<string> {
    const users = await this.userRepo.find({
      order: { trustScore: "DESC" },
    });

    const statusLabel: Record<UserStatus, string> = {
      active: "Hoạt động",
      review: "Cần xem xét",
      blocked: "Đã khóa",
    };

    const header = [
      "Mã người dùng",
      "Họ tên",
      "Khu vực",
      "Báo cáo",
      "Đã xác minh",
      "Từ chối",
      "Điểm tin cậy",
      "Xác thực",
      "Trạng thái",
      "Hoạt động cuối",
    ];

    const rows = users.map((user) => [
      user.id,
      user.name,
      user.district,
      String(user.reports),
      String(user.verifiedReports),
      String(user.rejectedReports),
      String(user.trustScore),
      user.identityVerified ? "Đã xác thực" : "Chưa xác thực",
      statusLabel[user.status],
      user.lastActive,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");

    return `\uFEFF${csv}`;
  }
}
