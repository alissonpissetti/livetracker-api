import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeolocateDto } from './dto/geolocate.dto';

interface GoogleGeolocateResponse {
  location: { lat: number; lng: number };
  accuracy: number;
}

@Injectable()
export class GeolocationService {
  constructor(private readonly config: ConfigService) {}

  async resolve(dto: GeolocateDto) {
    const key = this.config.get<string>('GOOGLE_GEOLOCATION_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'GOOGLE_GEOLOCATION_API_KEY não configurada no servidor',
      );
    }

    const payload: Record<string, unknown> = {
      radioType: dto.radioType ?? 'lte',
      cellTowers: dto.cellTowers.map((tower) => ({
        cellId: tower.cellId,
        mobileCountryCode: tower.mobileCountryCode,
        mobileNetworkCode: tower.mobileNetworkCode,
        age: tower.age ?? 0,
        ...(tower.locationAreaCode != null && {
          locationAreaCode: tower.locationAreaCode,
        }),
        ...(tower.signalStrength != null && {
          signalStrength: tower.signalStrength,
        }),
      })),
    };

    if (dto.homeMobileCountryCode != null && dto.homeMobileNetworkCode != null) {
      payload.homeMobileCountryCode = dto.homeMobileCountryCode;
      payload.homeMobileNetworkCode = dto.homeMobileNetworkCode;
    }

    if (dto.wifiAccessPoints?.length) {
      payload.wifiAccessPoints = dto.wifiAccessPoints.map((ap) => ({
        macAddress: ap.macAddress.toLowerCase(),
        ...(ap.signalStrength != null && {
          signalStrength: ap.signalStrength,
        }),
      }));
    }

    const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadGatewayException(
        `Google Geolocation API respondeu ${response.status}: ${detail}`,
      );
    }

    const data = (await response.json()) as GoogleGeolocateResponse;

    return {
      latitude: data.location.lat,
      longitude: data.location.lng,
      accuracy_m: data.accuracy,
    };
  }
}
