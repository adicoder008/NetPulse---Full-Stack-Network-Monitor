import { prisma } from "../../infrastructure/db/prisma.client.js";
import { Environment } from "@prisma/client";
import { ServiceListFilters, buildServiceWhere } from "../../lib/filters.js";

export class ServiceRepository {
  create(data: {
    name: string;
    url: string;
    intervalSec: number;
    tags?: string[];
    environment?: Environment;
  }) {
    return prisma.service.create({ data });
  }

  list(filters: ServiceListFilters = {}) {
    return prisma.service.findMany({
      where: buildServiceWhere(filters),
      orderBy: { createdAt: "desc" }
    });
  }

  getById(id: string) {
    return prisma.service.findUnique({ where: { id } });
  }

  update(
    id: string,
    data: {
      name?: string;
      url?: string;
      intervalSec?: number;
      isActive?: boolean;
      tags?: string[];
      environment?: Environment;
    }
  ) {
    return prisma.service.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.service.update({ where: { id }, data: { isActive: false } });
  }
}
