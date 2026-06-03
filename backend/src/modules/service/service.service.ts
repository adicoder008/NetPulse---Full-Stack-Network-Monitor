import { Environment } from "@prisma/client";
import { ServiceRepository } from "./service.repository.js";
import { TimelineService } from "../timeline/timeline.service.js";
import { ServiceListFilters } from "../../lib/filters.js";

const timeline = new TimelineService();

export class ServiceService {
  constructor(private readonly repo: ServiceRepository) {}

  async create(payload: {
    name: string;
    url: string;
    intervalSec: number;
    tags?: string[];
    environment?: Environment;
  }) {
    const service = await this.repo.create(payload);
    await timeline.record("SERVICE_CREATED", `Service "${service.name}" registered`, {
      serviceId: service.id,
      payload: { name: service.name, url: service.url, tags: service.tags, environment: service.environment }
    });
    return service;
  }

  list(filters?: ServiceListFilters) {
    return this.repo.list(filters);
  }

  getById(id: string) {
    return this.repo.getById(id);
  }

  update(
    id: string,
    payload: {
      name?: string;
      url?: string;
      intervalSec?: number;
      isActive?: boolean;
      tags?: string[];
      environment?: Environment;
    }
  ) {
    return this.repo.update(id, payload);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
