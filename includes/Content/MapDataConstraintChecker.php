<?php
namespace MediaWiki\Extension\DataMaps\Content;

use JsonSchema\Exception\ResourceNotFoundException;
use Status;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\DataConstraint;
use MediaWiki\MainConfigNames;
use MediaWiki\Utils\UrlUtils;
use stdClass;

class MapDataConstraintChecker {
    /** @var DataConstraint[] */
    private const CONSTRAINTS = [

    ];

    /** @var Status */
    private Status $status;
    /** @var stdClass */
    private stdClass $data;
    /** @var string */
    private MapVersionInfo $version;

    /**
     */
    public function __construct(
        MapVersionInfo $version,
        stdClass $data,
        Status $status
    ) {
        $this->status = $status;
        $this->data = $data;
        $this->version = $version;
    }

    public function run(): bool {
        $result = true;
        foreach ( self::CONSTRAINTS as $constraint ) {
            $result = $result && $constraint::run( $this->status, $this->version, $this->data );
        }
        return true;
    }
}
