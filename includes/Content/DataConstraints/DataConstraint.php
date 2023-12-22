<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use Status;
use stdClass;

interface DataConstraint {
    public static function run( Status $status, string $schema, stdClass $data ): bool;
}
