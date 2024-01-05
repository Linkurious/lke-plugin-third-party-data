import {ItemTypeAccessRightType, PropertyTypeName} from '@linkurious/rest-client';

import {VendorFieldTypeName} from '../../../shared/vendor/vendorModel';
import {Vendor} from '../../../shared/vendor/vendor';
import {ConstantFieldTypeName, FieldMapping} from '../../../shared/integration/IntegrationModel';
import {STRINGS} from '../../../shared/strings';
import {GraphItemSchema, GraphPropertySchema} from '../../../shared/api/response.ts';

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
      throw new Error(STRINGS.errors.checkSourceNodeMapping.noMappingsDefined);
    }
    for (const vendorField of vendor.searchQueryFields) {
      if (vendorField.required && !mappings.find((m) => m.outputPropertyKey === vendorField.key)) {
        throw new Error(STRINGS.errors.checkSourceNodeMapping.requiredFieldMissing(vendorField));
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
    const vendorField = vendor.searchQueryFields.find((f) => f.key === mapping.outputPropertyKey);
    if (!vendorField) {
      throw new Error(STRINGS.errors.checkSourceNodeMapping.unknownField(mapping));
    }
    if (mapping.type === 'constant') {
      // check that the value matches the expected type
      const valueType = typeof mapping.value;
      if (valueType !== vendorField.type) {
        throw new Error(
          STRINGS.errors.checkSourceNodeMapping.invalidConstantType(
            mapping,
            valueType,
            vendorField.type
          )
        );
      }
    } else if (mapping.type === 'property') {
      if (!mapping.inputPropertyKey) {
        throw new Error(STRINGS.errors.checkSourceNodeMapping.missingInputProperty);
      }
      this.checkGraphPropertyToVendorFieldMapping(
        mapping.inputPropertyKey,
        sourceNodeTypeSchema,
        vendorField.type
      );
    } else {
      throw new Error(STRINGS.errors.checkSourceNodeMapping.unknownMappingType(mapping.type));
    }
  }

  private static checkGraphPropertyToVendorFieldMapping(
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
        STRINGS.errors.checkSourceNodeMapping.unknownProperty(
          sourcePropertyKey,
          graphItemSchema.itemType
        )
      );
    }
    // check that the property type matches
    this.checkGraphPropertyToVendorFieldType(schemaProperty, vendorFieldType);
  }

  private static checkGraphPropertyToVendorFieldType(
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
        STRINGS.errors.checkSourceNodeMapping.invalidPropertyType(
          nodePropertySchema,
          vendorFieldType
        )
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
  static checkDetailsResponseToOutputNodeMapping(
    outputNodeFieldMapping: FieldMapping[] | undefined,
    outputNodeSchema: GraphItemSchema,
    vendor: Vendor
  ): void {
    if (outputNodeSchema.access !== ItemTypeAccessRightType.WRITE) {
      throw new Error(STRINGS.errors.outputMapping.outputNodeNotWritable(outputNodeSchema));
    }
    if (!outputNodeFieldMapping || outputNodeFieldMapping.length === 0) {
      throw new Error(STRINGS.errors.outputMapping.emptyMapping);
    }
    for (const mapping of outputNodeFieldMapping) {
      this.isOutputMapping(mapping, vendor, outputNodeSchema);
    }
  }

  private static checkVendorFieldToGraphPropertyType(
    sourceFieldKey: string,
    outputPropertySchema: GraphPropertySchema,
    vendor: Vendor
  ): void {
    // check that the property exists
    const vendorField = vendor.outputFields.find((p) => p.key === sourceFieldKey);
    if (!vendorField) {
      throw new Error(STRINGS.errors.outputMapping.unknownInputField(sourceFieldKey));
    }
    // check that the property type matches
    this.checkValueToGraphPropertyType('vendor field', vendorField.type, outputPropertySchema);
  }

  private static checkValueToGraphPropertyType(
    sourceKind: 'vendor field' | 'constant value',
    sourceType: ConstantFieldTypeName | VendorFieldTypeName,
    targetPropertySchema: GraphPropertySchema
  ): void {
    if (!this.getLegalValueTypeForProperty(targetPropertySchema.type).includes(sourceType)) {
      throw new Error(
        STRINGS.errors.outputMapping.invalidType(sourceKind, sourceType, targetPropertySchema)
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

  static isOutputMapping(
    mapping: Partial<FieldMapping>,
    vendor: Vendor,
    outputNodeSchema: GraphItemSchema
  ): asserts mapping is FieldMapping {
    const targetPropertySchema = outputNodeSchema.properties.find(
      (p) => p.propertyKey === mapping.outputPropertyKey
    );
    // check if the target property exists
    if (!targetPropertySchema) {
      console.info(
        `Output node mapping: will create new property on created node ${JSON.stringify(mapping)}`
      );
      return;
    }
    // the target property exists, check that its type matches the source value
    if (mapping.type === 'constant') {
      if (!mapping.valueType) {
        throw new Error(STRINGS.errors.outputMapping.constantWithoutType(mapping));
      }
      this.checkValueToGraphPropertyType('constant value', mapping.valueType, targetPropertySchema);
    } else if (mapping.type === 'property') {
      if (!mapping.inputPropertyKey) {
        throw new Error(
          STRINGS.errors.outputMapping.missingInputProperty(mapping.outputPropertyKey)
        );
      }
      this.checkVendorFieldToGraphPropertyType(
        mapping.inputPropertyKey,
        targetPropertySchema,
        vendor
      );
    }
  }
}
