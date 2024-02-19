<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

class MarkerUidNoOverlapConstraint implements DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-muidoverlap';

    public function getDependencies(): array {
        return [];
    }

    public function run( Status $status, MapVersionInfo $version, stdClass $data ): bool {
        if ( !isset( $data->markers ) ) {
            return true;
        }

        $result = true;

        $set = [];
        foreach ( (array)$data->markers as $assocStr => $markers ) {
            foreach ( $markers as $index => $marker ) {
                if ( isset( $marker->id ) ) {
                    if ( $set[$marker->id] ) {
                        $status->error( self::MESSAGE, "/markers/$assocStr/$index/id" );
                        $result = false;
                    }
                    $set[$marker->id] = true;
                }
            }
        }

        return $result;
    }
}
