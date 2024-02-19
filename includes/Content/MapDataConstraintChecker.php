<?php
namespace MediaWiki\Extension\DataMaps\Content;

use JsonSchema\Exception\ResourceNotFoundException;
use Status;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\AssociationStringGroupExistsConstraint;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\DataConstraint;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\LayerIdNoOverlapConstraint;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\MarkerUidNoOverlapConstraint;
use MediaWiki\Extension\DataMaps\Content\DataConstraints\RequiredFilesConstraint;
use MediaWiki\MainConfigNames;
use MediaWiki\Utils\UrlUtils;
use stdClass;

class MapDataConstraintChecker {
    /** @var Status */
    private Status $status;
    /** @var stdClass */
    private stdClass $data;
    /** @var MapVersionInfo */
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

    /**
     * @return DataConstraint[]
     */
    private function getConstraints(): array {
        return [
            new AssociationStringGroupExistsConstraint(),
            new LayerIdNoOverlapConstraint(),
            new MarkerUidNoOverlapConstraint(),
            new RequiredFilesConstraint(),
        ];
    }

    public function run(): bool {
        $result = true;
        $individual = [];
        foreach ( $this->getConstraints() as $constraint ) {
            foreach ( $constraint->getDependencies() as $dependency ) {
                if ( !$individual[$dependency] ) {
                    continue;
                }
            }

            $constraintResult = $constraint->run( $this->status, $this->version, $this->data );
            $individual[$constraint::class] = $constraintResult;
            $result = $result && $constraintResult;
        }
        return true;
    }
}
