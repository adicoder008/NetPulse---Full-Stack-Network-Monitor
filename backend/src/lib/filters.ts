import { Environment, Prisma } from "@prisma/client";

export type ServiceListFilters = {
  tags?: string[];
  environment?: Environment;
  search?: string;
};

export function parseEnvironment(value?: string): Environment | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper === "PRODUCTION" || upper === "STAGING" || upper === "DEVELOPMENT") {
    return upper as Environment;
  }
  return undefined;
}

export function buildServiceWhere(filters: ServiceListFilters): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = { isActive: true };

  if (filters.environment) {
    where.environment = filters.environment;
  }

  if (filters.tags?.length) {
    where.tags = { hasSome: filters.tags };
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { tags: { has: q } }
    ];
  }

  return where;
}

export function parseListQuery(query: {
  tags?: string;
  environment?: string;
  search?: string;
}): ServiceListFilters {
  return {
    tags: query.tags?.split(",").map((t) => t.trim()).filter(Boolean),
    environment: parseEnvironment(query.environment),
    search: query.search?.trim() || undefined
  };
}
