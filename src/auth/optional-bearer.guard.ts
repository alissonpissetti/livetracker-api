import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OptionalBearerGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.config.get<string>('API_BEARER_TOKEN', '').trim();
    if (!expectedToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization') ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || token !== expectedToken) {
      throw new UnauthorizedException('Token Bearer inválido ou ausente');
    }

    return true;
  }
}
