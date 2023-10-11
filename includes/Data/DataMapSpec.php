<?php
namespace MediaWiki\Extension\DataMaps\Data;

use MediaWiki\Extension\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use Status;
use stdClass;
use Title;

class DataMapSpec extends DataModel {
    protected static string $publicName = 'DataMapSpec';

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use CoordinateSystem::DEFAULT_SPACE. */
    public const DEFAULT_COORDINATE_SPACE = CoordinateSystem::DEFAULT_SPACE;

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;
    private ?array $cachedBackgrounds = null;
    private ?CoordinateSystem $coordinateSystem = null;
    private ?MapSettingsSpec $cachedSettings = null;

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use CoordinateSystem::ORDER_YX. */
    public const CO_YX = CoordinateSystem::ORDER_YX;
    /** @deprecated since 0.16.11, to be removed in 0.17.0; use CoordinateSystem::ORDER_XY. */
    public const CO_XY = CoordinateSystem::ORDER_XY;

    public const MARKER_ERROR_LIMIT = 30;

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use CoordinateSystem::normalisePoint. */
    public static function normalisePointCoordinates( array $value, int $order ): array {
        return CoordinateSystem::normalisePoint( $value, $order );
    }

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use CoordinateSystem::normaliseBox. */
    public static function normaliseBoxCoordinates( array $value, int $order ): array {
        return CoordinateSystem::normaliseBox( $value, $order );
    }

    public static function staticIsFragment( \stdclass $raw ): bool {
        return $raw->{'$fragment'} ?? $raw->{'$mixin'} ?? false;
    }

    public function isFragment(): bool {
        return self::staticIsFragment( $this->raw );
    }

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use staticIsFragment. */
    public static function staticIsMixin( \stdclass $raw ): bool {
        return self::staticIsFragment( $raw );
    }

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use isFragment. */
    public function isMixin(): bool {
        return self::staticIsFragment( $this->raw );
    }

    public function getRequiredFragments(): ?array {
        $list = $this->raw->include ?? $this->raw->mixins ?? null;
        if ( $list === null ) {
            return null;
        }

        return array_map( fn ( $el ) => Title::newFromText( $el, ExtensionConfig::getNamespaceId() ), $list );
    }

    /** @deprecated since 0.16.11, to be removed in 0.17.0; use isFragment. */
    public function getMixins(): ?array {
        return $this->getRequiredFragments();
    }

    /**
     * @deprecated since 0.16.11, to be removed in 0.17.0; use getCoordinateSystem()->getOrder().
     */
    public function getCoordinateOrder(): int {
        return $this->getCoordinateSystem()->getOrder();
    }

    /**
     * Retrieves the coordinate system setup.
     *
     * @since 0.16.11
     * @return CoordinateSystem
     */
    public function getCoordinateSystem(): CoordinateSystem {
        if ( $this->coordinateSystem === null ) {
            if ( is_object( $this->raw->crs ?? null ) ) {
                $this->coordinateSystem = new CoordinateSystem( $this->raw->crs );
            } else {
                $options = [ ];
                if ( isset( $this->raw->crs ) ) {
                    $options['topLeft'] = $this->raw->crs[0];
                    $options['bottomRight'] = $this->raw->crs[1];
                }
                if ( isset( $this->raw->coordinateOrder ) ) {
                    $options['order'] = $this->raw->coordinateOrder;
                }
                $this->coordinateSystem = new CoordinateSystem( ( object ) $options );
            }
        }
        return $this->coordinateSystem;
    }

    /**
     * If coordinate space spec is oriented [ lower lower upper upper ], assume top left corner as origin point (latitude will
     * be flipped). If [ upper upper lower lower ], assume bottom left corner (latitude will be unchanged). Any other layout is
     * invalid.
     *
     * @deprecated since 0.16.11, to be removed in 0.17.0; use getCoordinateSystem()->getBox().
     */
    public function getCoordinateReferenceSpace(): array {
        return $this->getCoordinateSystem()->getBox();
    }

    public function getBackgrounds(): array {
        if ( $this->cachedBackgrounds == null ) {
            if ( isset( $this->raw->image ) ) {
                $this->cachedBackgrounds = [
                    MapBackgroundSpec::fromImageName( $this->raw->image )
                ];
            } elseif ( is_string( $this->raw->background ?? null ) ) {
                $this->cachedBackgrounds = [
                    MapBackgroundSpec::fromImageName( $this->raw->background )
                ];
            } elseif ( isset( $this->raw->background ) ) {
                $this->cachedBackgrounds = [
                    new MapBackgroundSpec( $this->raw->background )
                ];
            } else {
                $this->cachedBackgrounds = array_map( fn ( $raw ) => new MapBackgroundSpec( $raw ), $this->raw->backgrounds );
            }
        }
        return $this->cachedBackgrounds;
    }

    public function getSettings(): MapSettingsSpec {
        if ( $this->cachedSettings === null ) {
            $this->cachedSettings = new MapSettingsSpec( $this->raw->settings ?? new stdClass() );
        }
        return $this->cachedSettings;
    }

    public function getCustomData(): ?object {
        return isset( $this->raw->custom ) ? $this->raw->custom : null;
    }

    public function getRawMarkerMap(): object {
        return isset( $this->raw->markers ) ? $this->raw->markers : new stdClass();
    }

    public function getRawMarkerGroupMap(): object {
        return $this->raw->groups;
    }

    public function getRawMarkerLayerMap(): object {
        return $this->raw->layers;
    }

    private function warmUpUsedMarkerTypes() {
        $groups = [];
        $specifiers = [];
        foreach ( array_keys( get_object_vars( $this->getRawMarkerMap() ) ) as &$name ) {
            $parts = explode( ' ', $name );
            $groups[] = array_shift( $parts );
            $specifiers = array_merge( $parts, $specifiers );
        }
        $this->cachedMarkerGroups = array_unique( $groups );
        $this->cachedMarkerLayers = array_values( array_unique( $specifiers ) );
    }

    public function getGroupNames(): array {
        if ( $this->cachedMarkerGroups == null ) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerGroups;
    }

    public function getLayerNames(): array {
        if ( $this->cachedMarkerLayers == null ) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerLayers;
    }

    public function getGroup( string $name ): MarkerGroupSpec {
        return new MarkerGroupSpec( $name, $this->raw->groups->$name );
    }

    public function hasLayer( string $name ): bool {
        return isset( $this->raw->layers->$name );
    }

    public function getLayer( string $name ): ?MarkerLayerSpec {
        return isset( $this->raw->layers ) ? (
            isset( $this->raw->layers->$name ) ? new MarkerLayerSpec( $name, $this->raw->layers->$name ) : null
        ) : null;
    }

    public function getDisclaimerText(): ?string {
        return $this->raw->disclaimer ?? null;
    }

    public function iterateGroups( callable $callback ) {
        foreach ( $this->getGroupNames() as &$name ) {
            $data = $this->getGroup( $name );
            if ( $callback( $data ) === false ) {
                break;
            }
        }
    }

    public function iterateDefinedLayers( callable $callback ) {
        foreach ( $this->getLayerNames() as &$name ) {
            $data = $this->getLayer( $name );
            if ( $data !== null ) {
                if ( $callback( $data ) === false ) {
                    break;
                }
            }
        }
    }

    public function iterateRawMarkerMap( callable $callback ) {
        foreach ( get_object_vars( $this->getRawMarkerMap() ) as $id => $data ) {
            if ( $callback( $id, $data ) === false ) {
                break;
            }
        }
    }

    public function iterateRawLayerMap( callable $callback ) {
        foreach ( get_object_vars( $this->getRawMarkerLayerMap() ) as $id => $data ) {
            if ( $callback( $id, $data ) === false ) {
                break;
            }
        }
    }

    public function validate( Status $status ) {
        // Perform full strict validation if this is a full map, otherwise limit it to certain fields and lenience
        $isFull = !$this->isMixin();

        $this->checkField( $status, '$schema', DataModel::TYPE_STRING );
        $this->checkField( $status, '$fragment', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => '$mixin',
            'type' => DataModel::TYPE_BOOL,
            '@replaced' => [ '0.16.11', '0.17.0', '$fragment' ]
        ] );
        $this->checkField( $status, [
            'name' => 'include',
            'type' => DataModel::TYPE_ARRAY,
            'itemType' => DataModel::TYPE_STRING,
            'itemCheck' => static function ( $status, $mixinName ) {
                // Make sure all fragments exist and have the right content model
                $title = Title::newFromText( $mixinName );
                $mixinPage = DataMapContent::loadPage( $title );

                if ( $title->getNamespace() !== ExtensionConfig::getNamespaceId() ) {
                    $status->fatal( 'datamap-error-validatespec-map-missing-fragment-ns',
                        wfEscapeWikiText( $mixinName ) );
                    return false;
                }

                if ( is_numeric( $mixinPage ) || $mixinPage->getData()->getValue() == null ) {
                    $status->fatal( 'datamap-error-validatespec-map-bad-mixin', wfEscapeWikiText( $mixinName ) );
                    return false;
                }

                return true;
            }
        ] );
        $this->checkField( $status, [
            'name' => 'mixins',
            'type' => DataModel::TYPE_ARRAY,
            '@replaced' => [ '0.16.11', '0.17.0', 'include' ],
            'itemType' => DataModel::TYPE_STRING,
            'itemCheck' => static function ( $status, $mixinName ) {
                // Make sure all mixins exist and are data maps
                $title = Title::newFromText( $mixinName, ExtensionConfig::getNamespaceId() );
                $mixinPage = DataMapContent::loadPage( $title );

                if ( is_numeric( $mixinPage ) || $mixinPage->getData()->getValue() == null ) {
                    $status->fatal( 'datamap-error-validatespec-map-bad-mixin', wfEscapeWikiText( $mixinName ) );
                    return false;
                }

                return true;
            }
        ] );
        $this->checkField( $status, [
            'name' => 'crs',
            'type' => [ DataModel::TYPE_OBJECT, DataModel::TYPE_VECTOR2X2 ],
            'check' => static function ( $status, $crs ) {
                if ( is_array( $crs ) ) {
                    $options = [
                        'topLeft' => $crs[0],
                        'bottomRight' => $crs[1],
                    ];
                    $crs = new CoordinateSystem( ( object ) $options );
                } else {
                    $crs = new CoordinateSystem( $crs );
                }
                return $crs->validate( $status );
            }
        ] );
        $this->checkField( $status, [
            'name' => 'coordinateOrder',
            'type' => DataModel::TYPE_STRING,
            'values' => [ 'yx', 'xy', 'latlon', 'lonlat' ],
            '@replaced' => [ '0.16.11', '0.17.0', 'crs.order' ]
        ] );

        if ( !$this->conflict( $status, [ 'image', 'background', 'backgrounds' ] ) ) {
            if ( isset( $this->raw->image ) ) {
                $this->checkField( $status, [
                    '@replaced' => [ '0.16.10', '0.17.0', 'background' ],
                    'name' => 'image',
                    'type' => DataModel::TYPE_FILE,
                    'fileMustExist' => true
                ] );
            } elseif ( isset( $this->raw->background ) ) {
                $this->checkField( $status, [
                    'name' => 'background',
                    'type' => [
                        DataModel::TYPE_FILE,
                        DataModel::TYPE_OBJECT
                    ],
                    'fileMustExist' => true,
                    'check' => static function ( $status, $value ) {
                        if ( is_object( $value ) ) {
                            return ( new MapBackgroundSpec( $value ) )->validate( $status, true );
                        }
                        return true;
                    }
                ] );
            } elseif ( isset( $this->raw->backgrounds ) ) {
                $this->checkField( $status, [
                    'name' => 'backgrounds',
                    'type' => DataModel::TYPE_ARRAY,
                    'check' => static function ( $status, $backgrounds ) {
                        $multipleBgs = count( $backgrounds ) > 1;
                        $out = true;
                        foreach ( $backgrounds as &$raw ) {
                            $spec = new MapBackgroundSpec( $raw );
                            if ( !$spec->validate( $status, !$multipleBgs ) ) {
                                $out = false;
                            }
                        }
                        return $out;
                    }
                ] );
            } elseif ( $isFull ) {
                $status->fatal( 'datamap-error-validate-field-required-either', self::$publicName, 'image', 'backgrounds' );
                $this->validationAreRequiredFieldsPresent = false;
            }
        }

        $this->checkField( $status, [
            'name' => 'settings',
            'type' => DataModel::TYPE_OBJECT,
            'check' => function ( $status, $raw ) {
                return $this->getSettings()->validate( $status );
            }
        ] );
        $this->checkField( $status, [
            'name' => 'groups',
            'type' => DataModel::TYPE_OBJECT,
            'required' => $isFull,
            'check' => static function ( $status, &$rawMap ) {
                $out = true;
                foreach ( $rawMap as $name => $group ) {
                    if ( empty( $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-no-group-name' );
                        $out = false;
                    }

                    if ( preg_match( '/\s/', $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-illegal-group-name', $name );
                        $out = false;
                    }

                    $spec = new MarkerGroupSpec( $name, $group );
                    if ( !$spec->validate( $status ) ) {
                        $out = false;
                    }
                }
                return $out;
            }
        ] );
        $this->checkField( $status, [
            'name' => 'layers',
            'type' => DataModel::TYPE_OBJECT,
            'check' => static function ( $status, &$rawMap ) {
                $out = true;
                foreach ( $rawMap as $name => $layer ) {
                    if ( empty( $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-no-layer-name' );
                        $out = false;
                    }

                    if ( preg_match( '/\s/', $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-illegal-layer-name', $name );
                        $out = false;
                    }

                    $spec = new MarkerLayerSpec( $name, $layer );
                    if ( !$spec->validate( $status ) ) {
                        $out = false;
                    }
                }
                return $out;
            }
        ] );
        $this->checkField( $status, [
            'name' => 'disclaimer',
            'type' => DataModel::TYPE_STRING
        ] );
        $this->checkField( $status, 'custom', DataModel::TYPE_OBJECT );
        $this->checkField( $status, [
            'name' => 'markers',
            'type' => DataModel::TYPE_OBJECT,
            'check' => function ( $status, &$rawMap ) use ( $isFull ) {
                $requireOwnIDs = $this->getSettings()->requiresMarkerIDs();
                $uidMap = [];
                $out = true;
                $markerErrorCount = 0;
                $this->iterateRawMarkerMap( function ( string $layers, array $rawMarkerCollection )
                    use ( &$status, &$requireOwnIDs, &$uidMap, $isFull, &$out, &$markerErrorCount ) {
                    // Skip this collection if error limit has been surpassed
                    if ( $markerErrorCount >= self::MARKER_ERROR_LIMIT ) {
                        return;
                    }

                    // Verify the association has no duplicate layers specified
                    $split = explode( ' ', $layers );
                    if ( count( $split ) !== count( array_unique( $split ) ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-duplicate-assoc-layers', wfEscapeWikiText( $layers ) );
                        $out = false;
                    }

                    // Check if the group is defined. Don't check layers, as it's not required for any of them to be actually
                    // defined - such layers will be treated as transparent by default.
                    $layers = explode( ' ', $layers );
                    $groupName = $layers[0];
                    if ( $isFull && !isset( $this->raw->groups->$groupName ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-missing-group', wfEscapeWikiText( $groupName ) );
                        $out = false;
                        return;
                    }

                    // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
                    // creating thousands of small, very short-lived (only one at a time) objects
                    $marker = new MarkerSpec( new \stdclass() );

                    // Validate each marker
                    foreach ( $rawMarkerCollection as &$rawMarker ) {
                        $marker->reassignTo( $rawMarker );
                        if ( !$marker->validate( $status, $requireOwnIDs ) ) {
                            $out = false;
                            $markerErrorCount++;

                            // Stop iterating if error limit has been surpassed
                            if ( $markerErrorCount >= self::MARKER_ERROR_LIMIT ) {
                                $status->fatal( 'datamap-error-validate-limit', 'MarkerSpec' );
                                return;
                            }
                        }

                        $uid = $marker->getCustomPersistentId();
                        if ( $uid !== null ) {
                            if ( isset( $uidMap[$uid] ) ) {
                                $status->fatal( 'datamap-error-validatespec-map-uid-conflict', wfEscapeWikiText( $uid ) );
                                $out = false;
                            }

                            $uidMap[$uid] = true;
                        }
                    }
                } );
                return $out;
            }
        ] );
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            // Validate there's no overlap between marker layer names and group names
            if ( isset( $this->raw->groups ) && isset( $this->raw->layers ) ) {
                foreach ( array_keys( get_object_vars( $this->getRawMarkerLayerMap() ) ) as &$name ) {
                    if ( isset( $this->raw->groups->{$name} ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-name-conflict-group-layer', wfEscapeWikiText( $name ) );
                    }
                }
            }

            // TODO: validate sublayers can reference parent layers properly (causes a frontend error)
        }
    }
}
