import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommunityUserEntity } from "./models/community-user.entity";
import { UsersService } from "./services/users.service";
import { UsersController } from "./controllers/users.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CommunityUserEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
