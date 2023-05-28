<?php
namespace MediaWiki\Extension\DataMaps\Data;

use MediaWiki\Extension\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use Status;
use stdClass;
use Title;

class DataMapSpec extends DataModel {
    protected static string $publicName = 'DataMapSpec';

    public const DEFAULT_COORDINATE_SPACE = [ [ 0, 0 ], [ 100, 100 ] ];

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;
    private ?array $cachedBackgrounds = null;
    private ?MapSettingsSpec $cachedSettings = null;

    public const CO_YX = 0;
    public const CO_XY = 1;

    public const MARKER_ERROR_LIMIT = 30;

    public static function normalisePointCoordinates( array $value, int $order ): array {
        if ( $order === self::CO_XY ) {
            $value = [ $value[1], $value[0] ];
        }
        return $value;
    }

    public static function normaliseBoxCoordinates( array $value, int $order ): array {
        if ( $order === self::CO_XY ) {
            $value = [ [ $value[0][1], $value[0][0] ], [ $value[1][1], $value[1][0] ] ];
        }
        return $value;
    }

    public static function staticIsMixin( \stdclass $raw ): bool {
        return isset( $raw->{'$mixin'} ) ? $raw->{'$mixin'} : false;
    }

    public function isMixin(): bool {
        return self::staticIsMixin( $this->raw );
    }

    public function getMixins(): ?array {
        return isset( $this->raw->mixins ) ? $this->raw->mixins : null;
    }

    public function getCoordinateOrder(): int {
        $value = isset( $this->raw->coordinateOrder ) ? $this->raw->coordinateOrder : 'yx';
        switch ( $value ) {
            case 'yx':
            case 'latlon':
                return self::CO_YX;
            case 'xy':
            case 'lonlat':
                return self::CO_XY;
        }
    }

    /**
     * If coordinate space spec is oriented [ lower lower upper upper ], assume top left corner as origin point (latitude will
     * be flipped). If [ upper upper lower lower ], assume bottom left corner (latitude will be unchanged). Any other layout is
     * invalid.
     */
    public function getCoordinateReferenceSpace(): array {
        return isset( $this->raw->crs ) ? $this->raw->crs : self::DEFAULT_COORDINATE_SPACE;
    }

    public function getBackgrounds(): array {
        if ( $this->cachedBackgrounds == null ) {
            if ( !isset( $this->raw->backgrounds ) ) {
                $this->cachedBackgrounds = [ MapBackgroundSpec::fromImageName( $this->raw->image ) ];
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
        foreach ( array_keys( get_object_vars( $this->raw->markers ) ) as &$name ) {
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
        $this->checkField( $status, '$mixin', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'mixins',
            'type' => DataModel::TYPE_ARRAY,
            'itemType' => DataModel::TYPE_STRING,
            'itemCheck' => static function ( $status, $mixinName ) {
                // Make sure all mixins exist and are data maps
                $title = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $mixinName );
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
            'type' => DataModel::TYPE_VECTOR2X2,
            'check' => static function ( $status, $crs ) {
                // Validate the coordinate system - only two supported schemes are [ lower lower higher higher ] (top-left), and
                // [ higher higher lower lower ] (bottom-left).
                $first = $crs[0];
                $second = $crs[1];
                if ( !( ( $first[0] < $second[0] && $first[1] < $second[1] ) || ( $first[0] > $second[0]
                    && $first[1] > $second[1] ) ) ) {
                    $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'crs',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                    return false;
                }
                return true;
            }
        ] );
        $this->checkField( $status, [
            'name' => 'coordinateOrder',
            'type' => DataModel::TYPE_STRING,
            'values' => [ 'yx', 'xy', 'latlon', 'lonlat' ]
        ] );

        if ( !$this->conflict( $status, [ 'image', 'backgrounds' ] ) ) {
            if ( isset( $this->raw->image ) ) {
                $this->checkField( $status, [
                    'name' => 'image',
                    'type' => DataModel::TYPE_FILE,
                    'fileMustExist' => true
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
                foreach ( array_keys( $this->getRawMarkerLayerMap() ) as &$name ) {
                    if ( isset( $this->raw->groups->{$name} ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-name-conflict-group-layer', wfEscapeWikiText( $name ) );
                    }
                }
            }

            // TODO: validate sublayers can reference parent layers properly (causes a frontend error)
        }
    }
}
