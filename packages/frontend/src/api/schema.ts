import {
  EntityType,
  GraphSchemaTypeWithAccess,
  RestClient,
  DataVisibility,
  ItemTypeAccessRightType
} from '@linkurious/rest-client';

import {asError} from '../../../shared/utils';
import {GraphItemSchema} from '../../../shared/api/response';

export type ItemAccess = 'read' | 'write';

export class Schema {
  constructor(private readonly api: RestClient) {}

  async getNodeTypeSchema(
    sourceKey: string,
    nodeCategory: string,
    access: ItemAccess = 'read',
    tolerateMissing = false
  ): Promise<GraphItemSchema> {
    try {
      return await this.getItemTypeSchema(sourceKey, EntityType.NODE, nodeCategory, access);
    } catch (e) {
      if (tolerateMissing && asError(e).message.includes('was not found')) {
        return {
          itemType: nodeCategory,
          access: ItemTypeAccessRightType.WRITE,
          properties: []
        };
      }
      throw e;
    }
  }

  async getEdgeTypeSchema(
    sourceKey: string,
    edgeType: string,
    access: ItemAccess = 'read'
  ): Promise<GraphItemSchema> {
    return this.getItemTypeSchema(sourceKey, EntityType.EDGE, edgeType, access);
  }

  private async getItemTypeSchema(
    sourceKey: string,
    entityType: EntityType,
    itemType: string,
    access: ItemAccess = 'read'
  ): Promise<GraphItemSchema> {
    const r = await this.api.graphSchema.getTypesWithAccess({
      sourceKey: sourceKey,
      entityType: entityType
    });
    const name = entityType === EntityType.NODE ? 'Node category' : 'Edge type';
    if (!r.isSuccess()) {
      throw new Error(`Error while getting ${entityType} schema: ${r.body.message}`);
    }
    const schema = r.body.results.find((t) => t.itemType === itemType);
    if (!schema) {
      throw new Error(`${name} "${itemType}" was not found in the graph schema`);
    }
    if (!this.isAccessOK(access, schema.access)) {
      throw new Error(`${name} "${itemType}" is not accessible in "${access}" in the graph schema`);
    }
    if (schema.visibility === DataVisibility.NONE) {
      throw new Error(`${name} "${itemType}" is set to "not visible" in the graph schema`);
    }
    return {
      itemType: schema.itemType,
      access: schema.access,
      properties: schema.properties
        .filter((p) => p.visibility !== DataVisibility.NONE)
        .map((p) => ({
          propertyKey: p.propertyKey,
          required: p.required,
          type: p.propertyType.name
        }))
    };
  }

  async getItemTypeNames(
    sourceKey: string,
    entityType: EntityType,
    access: ItemAccess
  ): Promise<string[]> {
    const itemTypes = await this.getItemTypes(sourceKey, entityType, access);
    return itemTypes.map((schemaItemType) => schemaItemType.itemType);
  }

  private async getItemTypes(
    sourceKey: string,
    entityType: EntityType,
    access: ItemAccess
  ): Promise<GraphSchemaTypeWithAccess[]> {
    const r = await this.api.graphSchema.getTypesWithAccess({
      entityType: entityType,
      sourceKey: sourceKey
    });
    if (!r.isSuccess()) {
      throw new Error(`Get ${entityType} types: could not get schema (${r.body.message})`);
    }
    return r.body.results.filter(
      (itemType) =>
        this.isAccessOK(access, itemType.access) && itemType.visibility !== DataVisibility.NONE
    );
  }

  private isAccessOK(access: ItemAccess, itemAccessRight: ItemTypeAccessRightType): boolean {
    const acceptedAccessRights =
      access === 'read'
        ? [
            ItemTypeAccessRightType.READ,
            ItemTypeAccessRightType.EDIT,
            ItemTypeAccessRightType.WRITE
          ]
        : [ItemTypeAccessRightType.WRITE];
    return acceptedAccessRights.includes(itemAccessRight);
  }
}
