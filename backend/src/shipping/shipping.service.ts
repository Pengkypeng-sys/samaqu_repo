import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ShippingService {
  constructor(private http: HttpService, private config: ConfigService) {}

  async check(origin: string, destination: string, weight: number, couriers?: string) {
    const key = this.config.get('BITESHIP_API_KEY');
    if (key) return this.checkBiteship(key, origin, destination, weight, couriers);
    return this.checkRajaOngkir(origin, destination, weight);
  }

  private async checkBiteship(key: string, origin: string, destination: string, weight: number, couriers = 'jne,jnt,sicepat') {
    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.biteship.com/v1/rates/couriers',
        { origin_postal_code: origin, destination_postal_code: destination, items: [{ name: 'Paket', value: 1000, weight }], couriers },
        { headers: { Authorization: key } },
      ),
    );
    return data;
  }

  private async checkRajaOngkir(origin: string, destination: string, weight: number) {
    const key = this.config.get('RAJAONGKIR_API_KEY');
    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.rajaongkir.com/starter/cost',
        `origin=${origin}&destination=${destination}&weight=${weight}&courier=jne`,
        { headers: { key, 'content-type': 'application/x-www-form-urlencoded' } },
      ),
    );
    return data;
  }
}
