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
    private string $schema;

    /**
     */
    public function __construct(
        string $schemaVersion,
        stdClass $data,
        Status $status
    ) {
        $this->status = $status;
        $this->data = $data;
        $this->schema = $schemaVersion;
    }

    public function run(): bool {
        $result = true;
        foreach ( self::CONSTRAINTS as $constraint ) {
            $result = $result && $constraint::run( $this->status, $this->schema, $this->data );
        }
        return true;
    }
}
