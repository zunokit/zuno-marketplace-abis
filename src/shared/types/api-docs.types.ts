export interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  authentication: {
    required: boolean;
    methods: string[];
    permissions?: string[];
  };
  parameters?: {
    name: string;
    type: string;
    location: "path" | "query" | "body" | "header";
    required: boolean;
    description: string;
    example?: string | number | boolean;
  }[];
  requestBody?: {
    contentType: string;
    schema: Record<string, unknown>;
    example: Record<string, unknown>;
  };
  responses: {
    statusCode: number;
    description: string;
    example: Record<string, unknown>;
  }[];
  examples: {
    language: string;
    code: string;
  }[];
}

export interface ApiEndpointGroup {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export interface ApiDocumentation {
  version: string;
  title: string;
  description: string;
  baseUrl: string;
  authentication: {
    methods: {
      name: string;
      type: string;
      description: string;
      how: string;
      example: string;
    }[];
  };
  rateLimiting: {
    description: string;
    tiers: {
      name: string;
      limit: string;
      description: string;
    }[];
  };
  errorCodes: {
    code: string;
    httpStatus: number;
    description: string;
    example: Record<string, unknown>;
  }[];
  endpointGroups: ApiEndpointGroup[];
}
