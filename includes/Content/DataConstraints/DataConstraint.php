<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use Status;
use stdClass;

interface DataConstraint {
    public static function run( Status $status, MapVersionInfo $version, stdClass $data ): bool;
}
