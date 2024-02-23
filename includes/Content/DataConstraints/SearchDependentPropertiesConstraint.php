<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

class SearchDependentPropertiesConstraint extends DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-searchdisabled';

    public function getDependencies(): array {
        return [];
    }

    public function run( MapVersionInfo $version, stdClass $data ): bool {
        if ( !isset( $data->settings ) ) {
            return true;
        }

        $hasSearch = ( $data->settings->enableSearch ?? false ) !== false;
        if ( $hasSearch ) {
            return true;
        }

        if ( isset( $data->groups ) ) {
            foreach ( (array)$data->groups as $groupId => $group ) {
                $fields = array_intersect( array_keys( (array)$group ), [
                    'canSearchFor',
                ] );
                if ( count( $fields ) > 0 ) {
                    $formatted = implode( ', ', array_map( fn ( $item ) => "<code>$item</code>", $fields ) );
                    $this->emitWarning( self::MESSAGE, "/groups/$groupId", $formatted );
                }
            }
        }

        // TODO: check markers

        return true;
    }
}
