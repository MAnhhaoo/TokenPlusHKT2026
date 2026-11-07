import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AreaAlertEntity } from "../models/area-alert.entity";
import { CreateAlertDto, QueryAlertDto } from "../dtos/create-alert.dto";
import { UpdateAlertDto } from "../dtos/update-alert.dto";
import { RealtimeService } from "../../realtime/services/realtime.service";

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AreaAlertEntity)
    private readonly alertRepo: Repository<AreaAlertEntity>,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  async findAll(query: QueryAlertDto): Promise<AreaAlertEntity[]> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.level) where.level = query.level;

    return this.alertRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<AreaAlertEntity> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo ${id}`);
    }
    return alert;
  }

  async create(dto: CreateAlertDto): Promise<AreaAlertEntity> {
    const count = await this.alertRepo.count();
    const nextNumber = 190 + count;
    const startedAt = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    const alert = this.alertRepo.create({
      id: `AL-0${nextNumber}`,
      area: dto.area,
      level: dto.level,
      hazardType: dto.hazardType,
      title: dto.title,
      message: dto.message,
      startedAt,
      expiresAt: dto.expiresAt,
      status: "active",
      channels: dto.channels,
      createdBy: dto.createdBy || "Nguyễn Minh",
    });

    const saved = await this.alertRepo.save(alert);
    this.realtimeService?.broadcast("alert.created", saved);
    return saved;
  }

  async update(id: string, dto: UpdateAlertDto): Promise<AreaAlertEntity> {
    const alert = await this.findOne(id);
    Object.assign(alert, dto);
    const saved = await this.alertRepo.save(alert);
    this.realtimeService?.broadcast("alert.updated", saved);
    return saved;
  }

  async endAlert(id: string) {
    const alert = await this.findOne(id);
    alert.status = "ended";
    const saved = await this.alertRepo.save(alert);
    this.realtimeService?.broadcast("alert.ended", saved);
    return {
      message: `Đã kết thúc cảnh báo ${id}.`,
      alert: saved,
    };
  }
}
