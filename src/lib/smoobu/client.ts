import type {
  SmoobuApartment,
  SmoobuReservation,
  SmoobuReservationsResponse,
  CreateReservationPayload,
  UpdateReservationPayload,
  SmoobuRatesResponse,
} from "./types";

const BASE_URL = "https://login.smoobu.com/api";

class SmoobuApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`Smoobu API ${status}: ${message}`);
    this.name = "SmoobuApiError";
  }
}

class SmoobuClient {
  private apiKey: string;
  private failCount = 0;
  private circuitOpenUntil = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Circuit breaker: skip calls if too many recent failures
    if (this.failCount >= 5 && Date.now() < this.circuitOpenUntil) {
      throw new SmoobuApiError(503, "Circuit breaker open – Smoobu temporarily unavailable");
    }
    // Reset fail count once cooldown has expired
    if (this.failCount >= 5 && Date.now() >= this.circuitOpenUntil) {
      this.failCount = 0;
    }

    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Api-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // Only trigger circuit breaker on server errors (5xx), not client errors (4xx)
      // 400 validation errors should not block subsequent requests
      if (res.status >= 500) {
        this.failCount++;
        this.circuitOpenUntil = Date.now() + 60_000; // 60s cooldown
      }
      throw new SmoobuApiError(res.status, text || res.statusText);
    }

    // Reset circuit breaker on success
    this.failCount = 0;

    // Some endpoints return empty body (204)
    if (res.status === 204) return {} as T;
    return res.json();
  }

  // ── Apartments ──

  async getApartments(): Promise<SmoobuApartment[]> {
    const data = await this.request<{ apartments: SmoobuApartment[] }>(
      "/apartments",
    );
    return data.apartments;
  }

  // ── Reservations ──

  async getReservations(params: {
    from?: string;
    to?: string;
    apartmentId?: number;
    page?: number;
    pageSize?: number;
    showCancellation?: boolean;
  } = {}): Promise<SmoobuReservationsResponse> {
    const searchParams = new URLSearchParams();
    if (params.from) searchParams.set("from", params.from);
    if (params.to) searchParams.set("to", params.to);
    if (params.apartmentId) searchParams.set("apartmentId", String(params.apartmentId));
    if (params.page) searchParams.set("page", String(params.page));
    if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params.showCancellation) searchParams.set("showCancellation", "true");

    return this.request<SmoobuReservationsResponse>(
      `/reservations?${searchParams}`,
    );
  }

  async getReservation(id: number): Promise<SmoobuReservation> {
    return this.request<SmoobuReservation>(`/reservations/${id}`);
  }

  async createReservation(
    data: CreateReservationPayload,
  ): Promise<SmoobuReservation> {
    return this.request<SmoobuReservation>("/reservations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateReservation(
    id: number,
    data: UpdateReservationPayload,
  ): Promise<void> {
    await this.request(`/reservations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async cancelReservation(id: number): Promise<void> {
    await this.request(`/reservations/${id}`, { method: "DELETE" });
  }

  // ── Rates ──

  async getRates(params: {
    apartments: number[];
    start_date: string;
    end_date: string;
  }): Promise<SmoobuRatesResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("start_date", params.start_date);
    searchParams.set("end_date", params.end_date);
    params.apartments.forEach((id) =>
      searchParams.append("apartments[]", String(id)),
    );
    return this.request<SmoobuRatesResponse>(`/rates?${searchParams}`);
  }
}

// ── Singleton ──

let client: SmoobuClient | null = null;

export function createSmoobuClient(): SmoobuClient | null {
  const apiKey = process.env.SMOOBU_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new SmoobuClient(apiKey);
  }
  return client;
}

export { SmoobuApiError };
