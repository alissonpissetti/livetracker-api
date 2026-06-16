export const createLocationMinimalExample = {
  device_id: '868123456789012',
  latitude: -23.5505199,
  longitude: -46.6333094,
  recorded_at: '2026-06-15T18:30:00Z',
};

export const createLocationFullExample = {
  ...createLocationMinimalExample,
  altitude: 760.5,
  speed_knots: 0,
  accuracy_m: 3.5,
  satellites_visible: 12,
  satellites_used: 8,
  imei: '868123456789012',
  iccid: '89550123456789012345',
  imsi: '724051234567890',
  operator: 'Vivo',
  apn: 'm2m.vivo.com.br',
};

export const latestLocationsExample = {
  device_id: '868123456789012',
  locations: [
    {
      id: 'cdf6b5de-08d5-4e24-854e-04dcf7d405f5',
      device_id: '868123456789012',
      latitude: -23.5505199,
      longitude: -46.6333094,
      altitude: 760.5,
      speed_knots: 0,
      accuracy_m: 3.5,
      satellites_visible: 12,
      satellites_used: 8,
      imei: '868123456789012',
      recorded_at: '2026-06-15T18:30:00Z',
      received_at: '2026-06-15T18:30:01.234Z',
    },
  ],
};
