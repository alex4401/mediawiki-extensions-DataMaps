<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use Status;
use stdClass;

class RequiredFilesConstraint implements DataConstraint {
    private const MESSAGE = 'datamap-validate-constraint-requiredfile';

    public function getDependencies(): array {
        return [];
    }

    public function run( Status $status, MapVersionInfo $version, stdClass $data ): bool {
        $result = true;

        if ( isset( $data->groups ) ) {
            foreach ( (array)$data->groups as $groupId => $group ) {
                if ( isset( $group->icon ) && !$this->checkFile( $group->icon ) ) {
                    $status->error( self::MESSAGE, "/groups/$groupId/icon" );
                    $result = false;
                }
            }
        }

        if ( isset( $data->categories ) ) {
            foreach ( (array)$data->categories as $categoryId => $category ) {
                if ( isset( $category->overrideIcon ) && !$this->checkFile( $category->overrideIcon ) ) {
                    $status->error( self::MESSAGE, "/categories/$categoryId/overrideIcon" );
                    $result = false;
                }
            }
        }

        if ( isset( $data->background ) ) {
            if ( is_string( $data->background ) ) {
                if ( !$this->checkFile( $data->background ) ) {
                    $status->error( self::MESSAGE, '/background' );
                    $result = false;
                }
            } else {
                $result = $result && $this->checkBackground( $status, $version, $data->background, '/background' );
            }
        }

        if ( isset( $data->backgrounds ) ) {
            foreach ( (array)$data->backgrounds as $index => $background ) {
                $result = $result && $this->checkBackground( $status, $version, $background, "/backgrounds/$index" );
            }
        }

        if ( isset( $data->markers ) ) {
            foreach ( (array)$data->markers as $assocStr => $markers ) {
                foreach ( $markers as $index => $marker ) {
                    if ( isset( $marker->icon ) && !$this->checkFile( $marker->icon ) ) {
                        $status->error( self::MESSAGE, "/markers/$assocStr/$index/icon" );
                        $result = false;
                    }

                    if ( isset( $marker->image ) && !$this->checkFile( $marker->image ) ) {
                        $status->error( self::MESSAGE, "/markers/$assocStr/$index/image" );
                        $result = false;
                    }
                }
            }
        }

        return $result;
    }

    private function checkFile( $fileName ): bool {
        $file = DataMapFileUtils::getFile( $fileName );
        return $file && $file->exists();
    }

    private function checkBackground( Status $status, MapVersionInfo $version, stdClass $data, string $ptr ): bool {
        $result = true;

        if ( isset( $data->image ) && !$this->checkFile( $data->image ) ) {
            $status->error( self::MESSAGE, "$ptr/image" );
            $result = false;
        }

        // TODO: tiles
        // TODO: overlays

        return $result;
    }
}
