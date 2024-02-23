<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

class BackgroundLayerExistsConstraint extends DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-bglayerexists';

    public function getDependencies(): array {
        return [];
    }

    public function run( MapVersionInfo $version, stdClass $data ): bool {
        if ( !isset( $data->markers ) ) {
            return true;
        }

        $validLayers = [];
        if ( isset( $data->background ) && is_string( $data->background ) ) {
            $validLayers[] = 'bg:0';
        } else if ( isset( $data->background ) ) {
            $validLayers[] = 'bg:' . ( $data->associatedLayer ?? '0' );
        } else if ( isset( $data->backgrounds ) ) {
            foreach ( $data->backgrounds as $index => $background ) {
                $validLayers[] = 'bg:' . ( $background->associatedLayer ?? $index );
            }
        }

        $result = true;

        if ( isset( $data->markers ) ) {
            foreach ( array_keys( (array)$data->markers ) as $assocStr ) {
                $badAssocLayers = array_filter(
                    array_filter(
                        explode( ' ', $assocStr ),
                        fn ( $item ) => str_starts_with( $item, 'bg:' )
                    ),
                    fn ( $item ) => !in_array( $item, $validLayers )
                );

                if ( count( $badAssocLayers ) > 0 ) {
                    $formatted = implode( ', ', array_map( fn ( $item ) => "<code>$item</code>", $badAssocLayers ) );
                    $this->emitError( self::MESSAGE, "/markers/$assocStr", $formatted );
                    $result = false;
                }
            }
        }

        return $result;
    }
}
