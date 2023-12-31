import {ItemTypeAccessRightType} from '@linkurious/rest-client/dist/src/api/AccessRight/types';
import {PropertyTypeName} from '@linkurious/rest-client/dist/src/api/GraphSchema/types';

import {GraphItemSchema, GraphPropertySchema} from '../api/schema';
import {VendorFieldTypeName} from '../../../shared/vendor/vendorModel';
import {Vendor} from '../../../shared/vendor/vendor';
import {ConstantFieldTypeName, FieldMapping} from '../../../shared/integration/IntegrationModel';

export class IntegrationModelChecker {
  /*
  private readonly model: IntegrationModel;
  private readonly vendor: VendorModel;

  constructor(model: IntegrationModel, vendor: Vendor) {
    this.model = model;
    this.vendor = vendor.getVendorByKey(model.vendorKey);
  }

  async check(services: ServiceFacade): Promise<void> {
    const sourceNodeSchema = await services.schema.getNodeTypeSchema(
      this.model.sourceKey,
      this.model.sourceNodeCategory
    );
    IntegrationModelChecker.checkSourceNodeToSearchQueryMapping(
      this.model.searchQueryFieldMapping,
      sourceNodeSchema,
      this.vendor
    );

    this.checkSearchResponseFieldSelection();

    const targetEdgeSchema = await services.schema.getEdgeTypeSchema(
      this.model.sourceKey,
      this.model.targetEdgeType
    );
    this.checkCreatedEdgeType(targetEdgeSchema);

    const targetNodeSchema = await services.schema.getNodeTypeSchema(
      this.model.sourceKey,
      this.model.targetNodeCategory
    );
    IntegrationModelChecker.checkDetailsResponseToTargetNodeMapping(
      this.model.targetNodeFieldMapping,
      targetNodeSchema,
      this.vendor
    );
  }
   */

  /**
   * For each SourceNode to SearchQuery field mapping:
   * - check that the target SearchQuery field exists (in the vendor search query fields)
   * - check that the target SearchQuery field type matches the source value (either constant or SourceNode property type)
   */
  static checkSourceNodeMappings(
    mappings: FieldMapping[] | undefined,
    sourceNodeTypeSchema: GraphItemSchema,
    vendor: Vendor
  ): void {
    if (!mappings || mappings.length === 0) {
      throw new Error('At least one search query mapping must be defined');
    }
    for (const vendorFields of vendor.searchQueryFields) {
      if (
        vendorFields.required &&
        !mappings.find((m) => m.outputPropertyKey === vendorFields.key)
      ) {
        throw new Error(`Search query mapping: required field "${vendorFields.key}" is missing`);
      }
    }
    for (const mapping of mappings) {
      IntegrationModelChecker.checkSourceNodeMapping(mapping, vendor, sourceNodeTypeSchema);
    }
  }

  public static checkSourceNodeMapping(
    mapping: Partial<FieldMapping>,
    vendor: Vendor,
    sourceNodeTypeSchema: GraphItemSchema
  ): asserts mapping is FieldMapping {
    const prefix = 'Search query mapping';
    const vendorField = vendor.searchQueryFields.find((f) => f.key === mapping.outputPropertyKey);
    if (!vendorField) {
      throw new Error(`${prefix}: vendor field "${mapping.outputPropertyKey}" is unknown`);
    }
    if (mapping.type === 'constant') {
      // check that the value matches the expected type
      const valueType = typeof mapping.value;
      if (valueType !== vendorField.type) {
        throw new Error(
          `${prefix}: constant value for "${mapping.outputPropertyKey}" is invalid (got ${valueType}, expected ${vendorField.type})`
        );
      }
    } else if (mapping.type === 'property') {
      if (!mapping.inputPropertyKey) {
        throw new Error(`${prefix}: source node property must be defined`);
      }
      this.checkGraphPropertyToVendorFieldMapping(
        prefix,
        mapping.inputPropertyKey,
        sourceNodeTypeSchema,
        vendorField.type
      );
    } else {
      throw new Error(`${prefix}: unknown mapping type "${mapping.type}"`);
    }
  }

  private static checkGraphPropertyToVendorFieldMapping(
    errorPrefix: string,
    sourcePropertyKey: string,
    graphItemSchema: GraphItemSchema,
    vendorFieldType: VendorFieldTypeName
  ): void {
    // check that the property exists
    const schemaProperty = graphItemSchema.properties.find(
      (p) => p.propertyKey === sourcePropertyKey
    );
    if (!schemaProperty) {
      throw new Error(
        `${errorPrefix}: unknown property "${sourcePropertyKey}" for node category "${graphItemSchema.itemType}"`
      );
    }
    /*
    // check that the property is accessible
    if (schemaProperty.access === PropertyAccessRightType.NONE) {
      throw new Error(
        `${errorPrefix}: property "${sourcePropertyKey}" for node category "${graphItemSchema.itemType}" is not accessible in the graph schema`
      );
    }
    // check that the property is visible
    if (schemaProperty.visibility === DataVisibility.NONE) {
      throw new Error(
        `${errorPrefix}: property "${sourcePropertyKey}" for node category "${graphItemSchema.itemType}" is set to "not visible" in the graph schema`
      );
    }
     */
    // check that the property type matches
    this.checkGraphPropertyToVendorFieldType(errorPrefix, schemaProperty, vendorFieldType);
  }

  private static checkGraphPropertyToVendorFieldType(
    errorPrefix: string,
    nodePropertySchema: GraphPropertySchema,
    vendorFieldType: VendorFieldTypeName
  ): void {
    if (
      !IntegrationModelChecker.isLegalPropertyToVendorField(
        nodePropertySchema.type,
        vendorFieldType
      )
    ) {
      throw new Error(
        `${errorPrefix}: graph property "${nodePropertySchema.propertyKey}" is of type "${nodePropertySchema.type}" in the graph schema, but should be of type "${vendorFieldType}" to match the vendor field`
      );
    }
  }

  /*
  private checkSearchResponseFieldSelection(): void {
    for (const field of this.model.searchResponseFieldSelection) {
      const vendorField = this.vendor.searchResponseFields.find((f) => f.key === field);
      if (!vendorField) {
        throw new Error(`Search response selection: field "${field}" is unknown`);
      }
    }
  }

  private checkCreatedEdgeType(createdEdgeSchema: GraphItemSchema): void {
    if (createdEdgeSchema.access !== ItemTypeAccessRightType.WRITE) {
      throw new Error(`Created edge-type "${createdEdgeSchema.itemType}" is not writable`);
    }
  }
  */

  /**
   * - check that the target CreateNode type can be created (writable)
   * - for each DetailsResponse to CreatedNode field mapping:
   *   - check that if target CreatedNode property exists (or can be created)
   *   - if the target CreatedNode property exists, check that its type matches the source value (either constant or DetailsResponse field type)
   */
  static checkDetailsResponseToTargetNodeMapping(
    targetNodeFieldMapping: FieldMapping[] | undefined,
    targetNodeSchema: GraphItemSchema,
    vendor: Vendor
  ): void {
    if (targetNodeSchema.access !== ItemTypeAccessRightType.WRITE) {
      throw new Error(`Target node-category "${targetNodeSchema.itemType}" is not writable`);
    }
    if (!targetNodeFieldMapping || targetNodeFieldMapping.length === 0) {
      throw new Error('At least one node field mapping must be defined');
    }
    for (const mapping of targetNodeFieldMapping) {
      this.isDetailsMapping(mapping, vendor, targetNodeSchema);
    }
  }

  private static checkVendorFieldToGraphPropertyType(
    errorPrefix: string,
    sourceFieldKey: string,
    targetPropertySchema: GraphPropertySchema,
    vendor: Vendor
  ): void {
    // check that the property exists
    const vendorField = vendor.outputFields.find((p) => p.key === sourceFieldKey);
    if (!vendorField) {
      throw new Error(`${errorPrefix}: unknown vendor property "${sourceFieldKey}"`);
    }
    // check that the property type matches
    this.checkValueToGraphPropertyType(
      errorPrefix,
      'vendor field',
      vendorField.type,
      targetPropertySchema
    );
  }

  private static checkValueToGraphPropertyType(
    errorPrefix: string,
    sourceKind: 'vendor field' | 'constant value',
    sourceType: ConstantFieldTypeName | VendorFieldTypeName,
    targetPropertySchema: GraphPropertySchema
  ): void {
    if (!this.getLegalValueTypeForProperty(targetPropertySchema.type).includes(sourceType)) {
      throw new Error(
        `${errorPrefix}: ${sourceKind} of type "${sourceType}" cannot be assigned to node property "${targetPropertySchema.propertyKey}" of type "${targetPropertySchema.type}"`
      );
    }
  }

  static isLegalPropertyToVendorField(
    sourceType: PropertyTypeName,
    targetType: VendorFieldTypeName
  ): boolean {
    return this.LEGAL_SOURCE_PROPERTY_TYPE_BY_TARGET_TYPE[targetType].includes(sourceType);
  }

  private static readonly LEGAL_SOURCE_PROPERTY_TYPE_BY_TARGET_TYPE: Record<
    ConstantFieldTypeName | VendorFieldTypeName,
    PropertyTypeName[]
  > = {
    // target property: string => legal sources: string, number, auto
    string: [PropertyTypeName.STRING, PropertyTypeName.NUMBER, PropertyTypeName.AUTO],
    // target property: number => legal sources: number
    number: [PropertyTypeName.NUMBER],
    // target property: boolean => legal sources: boolean
    boolean: [PropertyTypeName.BOOLEAN]
  };

  /**
   * Get the legal value type that can be written into a property of type `propertyType`
   */
  static getLegalValueTypeForProperty(
    propertyType: PropertyTypeName
  ): (ConstantFieldTypeName | VendorFieldTypeName)[] {
    switch (propertyType) {
      case PropertyTypeName.AUTO:
      case PropertyTypeName.STRING:
        return ['string', 'number', 'boolean'];
      case PropertyTypeName.NUMBER:
        return ['number'];
      case PropertyTypeName.BOOLEAN:
        return ['boolean'];
      default:
        return [];
    }
  }

  static isDetailsMapping(
    mapping: Partial<FieldMapping>,
    vendor: Vendor,
    targetNodeSchema: GraphItemSchema
  ): asserts mapping is FieldMapping {
    const prefix = 'Target node field mapping';
    const targetPropertySchema = targetNodeSchema.properties.find(
      (p) => p.propertyKey === mapping.outputPropertyKey
    );
    // check if the target property exists
    if (!targetPropertySchema) {
      console.warn(
        `${prefix}: will create new property on created node ${JSON.stringify(mapping)}`
      );
      return;
    }
    // the target property exists, check that its type matches the source value
    if (mapping.type === 'constant') {
      if (!mapping.valueType) {
        throw new Error(`${prefix}: constant value type must be defined`);
      }
      this.checkValueToGraphPropertyType(
        prefix,
        'constant value',
        mapping.valueType,
        targetPropertySchema
      );
    } else if (mapping.type === 'property') {
      if (!mapping.inputPropertyKey) {
        throw new Error(`${prefix}: source field key must be defined`);
      }
      this.checkVendorFieldToGraphPropertyType(
        prefix,
        mapping.inputPropertyKey,
        targetPropertySchema,
        vendor
      );
    }
  }
}
