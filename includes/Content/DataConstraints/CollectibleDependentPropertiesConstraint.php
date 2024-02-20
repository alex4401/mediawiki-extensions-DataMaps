<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

class CollectibleDependentPropertiesConstraint implements DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-notcollectible';

    public function getDependencies(): array {
        return [];
    }

    public function run( Status $status, MapVersionInfo $version, stdClass $data ): bool {
        if ( !isset( $data->groups ) ) {
            return true;
        }

        if ( isset( $data->groups ) ) {
            foreach ( (array)$data->groups as $groupId => $group ) {
                $isCollectible = ( $group->isCollectible ?? false ) !== false;
                if ( !$isCollectible ) {
                    continue;
                }

                $fields = array_intersect( array_keys( (array)$group ), [
                    'autoNumberInChecklist',
                ] );
                if ( count( $fields ) > 0 ) {
                    $formatted = implode( ', ', array_map( fn ( $item ) => "<code>$item</code>", $fields ) );
                    $status->warning( self::MESSAGE, "/groups/$groupId", $formatted );
                }
            }
        }

        return true;
    }
}
