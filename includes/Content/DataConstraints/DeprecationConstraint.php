<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

class DeprecationConstraint implements DataConstraint {
    private const INSTEAD_MESSAGE = 'datamap-validate-constraint-deprecated-instead';
    private const NO_ALTERNATIVES_MESSAGE = 'datamap-validate-constraint-deprecated-noalt';

    public function getDependencies(): array {
        return [];
    }

    public function run( Status $status, MapVersionInfo $version, stdClass $data ): bool {
        // REV17 - REV18: settings.leaflet - no replacement
        if ( isset( $data->settings ) && isset( $data->settings->leaflet ) ) {
            $status->warning( self::NO_ALTERNATIVES_MESSAGE, 'v17', 'v18', '/data/settings/leaflet' );
        }

        return true;
    }
}
