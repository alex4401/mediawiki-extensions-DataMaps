<?php
namespace MediaWiki\Extension\DataMaps\Data;

use InvalidArgumentException;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use Status;
use stdClass;

class DataModel {
    protected static string $publicName = '???';

    protected stdClass $raw;
    public function __construct( stdClass $raw ) {
        if ( is_array( $raw ) ) {
            $raw = (object)$raw;
        }
        $this->raw = $raw;
    }

    public function unwrap(): stdClass {
        return $this->raw;
    }
}
