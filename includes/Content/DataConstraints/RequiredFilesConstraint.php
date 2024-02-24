<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use MediaWiki\Extension\DataMaps\Content\StatusUtils;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use stdClass;

class RequiredFilesConstraint extends DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-requiredfile';

    public function getDependencies(): array {
        return [];
    }

    public function run( MapVersionInfo $version, stdClass $data ): bool {
        $results = [];

        if ( isset( $data->groups ) ) {
            foreach ( (array)$data->groups as $_ => $group ) {
                if ( isset( $group->icon ) && !$this->checkFile( $group->icon ) ) {
                    $results[] = $group->icon;
                }
            }
        }

        if ( isset( $data->categories ) ) {
            foreach ( (array)$data->categories as $_ => $category ) {
                if ( isset( $category->overrideIcon ) && !$this->checkFile( $category->overrideIcon ) ) {
                    $results[] = $category->overrideIcon;
                }
            }
        }

        if ( isset( $data->background ) ) {
            if ( is_string( $data->background ) ) {
                if ( !$this->checkFile( $data->background ) ) {
                    $results[] = $data->background;
                }
            } else {
                $this->checkBackground( $version, $data->background, $results );
            }
        }

        if ( isset( $data->backgrounds ) ) {
            foreach ( (array)$data->backgrounds as $index => $background ) {
                $this->checkBackground( $version, $background, $results );
            }
        }

        if ( isset( $data->markers ) ) {
            foreach ( (array)$data->markers as $assocStr => $markers ) {
                foreach ( $markers as $index => $marker ) {
                    if ( isset( $marker->icon ) && !$this->checkFile( $marker->icon ) ) {
                        $results[] = $marker->icon;
                    }

                    if ( isset( $marker->image ) && !$this->checkFile( $marker->image ) ) {
                        $results[] = $marker->image;
                    }
                }
            }
        }

        if ( count( $results ) > 0 ) {
            $this->emitError( self::MESSAGE, StatusUtils::formatArray( $results ) );
            return false;
        }

        return true;
    }

    private function checkFile( $fileName ): bool {
        $file = DataMapFileUtils::getFile( $fileName );
        return $file && $file->exists();
    }

    private function checkBackground( MapVersionInfo $version, stdClass $data, array &$results ): bool {
        $result = true;

        if ( isset( $data->image ) && !$this->checkFile( $data->image ) ) {
            $results[] = $data->image;
        }

        // TODO: tiles
        // TODO: overlays

        return $result;
    }
}
