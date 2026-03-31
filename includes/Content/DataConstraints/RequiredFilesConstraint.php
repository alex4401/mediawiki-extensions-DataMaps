<?php
namespace MediaWiki\Extension\DataMaps\Content\DataConstraints;

use MediaWiki\Extension\DataMaps\Content\MapVersionInfo;
use MediaWiki\Extension\DataMaps\Content\StatusUtils;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use stdClass;

class RequiredFilesConstraint extends DataConstraint {
    private const MESSAGE_BAD = 'datamap-validate-constraint-badfiletitle';
    private const MESSAGE_MISSING = 'datamap-validate-constraint-requiredfile';

    public function getDependencies(): array {
        return [];
    }

    public function run( MapVersionInfo $version, stdClass $data ): bool {
        // Collection of of bad titles and missing files. This should be populated by helper methods handling specific
        // structures, such as `checkFile` or `checkBackground`.
        $results = [
            // All string titles, because Title objects can't exist for these
            'bad' => [],
            // Actual titles
            'missing' => [],
        ];

        if ( isset( $data->groups ) ) {
            foreach ( (array)$data->groups as $_ => $group ) {
                if ( isset( $group->icon ) ) {
                    $this->checkFile( $group->icon, $results );
                }
            }
        }

        if ( isset( $data->categories ) ) {
            foreach ( (array)$data->categories as $_ => $category ) {
                if ( isset( $category->overrideIcon ) ) {
                    $this->checkFile( $category->overrideIcon, $results );
                }
            }
        }

        if ( isset( $data->background ) ) {
            if ( is_string( $data->background ) ) {
                $this->checkFile( $data->background, $results );
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
                    if ( isset( $marker->icon ) ) {
                        $this->checkFile( $marker->icon, $results );
                    }

                    if ( isset( $marker->image ) ) {
                        $this->checkFile( $marker->image, $results );
                    }
                }
            }
        }

        // Display user hints
        $retval = true;

        if ( !$results['bad'] ) {
            $this->emitError( self::MESSAGE_BAD, StatusUtils::formatArrayUnescaped( $results['bad'] ) );
            $retval = false;
        }

        if ( !$results['missing'] ) {
            $uploadTitle = SpecialPage::getTitleFor( 'Upload' );
            $preformatted = array_map(
                static function ( $el ) use ( $uploadTitle ) {
                    $fileTitle = Title::makeTitleSafe( NS_FILE, $el );
                    return '[' . $uploadTitle->getFullURL( [
                                'wpDestFile' => $fileTitle->getText()
                            ] ) . ' ' . $fileTitle->getPrefixedText() . ']';
                },
                $results
            );
            $this->emitError( self::MESSAGE_MISSING, StatusUtils::formatArrayUnescaped( $preformatted ) );
            $retval = false;
        }

        return $retval;
    }

    private function checkFile( string $fileName, array &$results ): bool {
        // Check if a valid file namespace title
        $title = Title::newFromText( $fileName, NS_FILE );
        if ( !$title || !$title->inNamespace( NS_FILE ) ) {
            $results['bad'][] = $fileName;
            return false;
        }

        // Check if missing
        $file = DataMapFileUtils::getFile( $title->getDBkey() );
        if ( !$file || !$file->exists() ) {
            $results['missing'][] = $title;
            return false;
        }

        return true;
    }

    private function checkBackground( MapVersionInfo $version, stdClass $data, array &$results ): bool {
        $result = true;

        if ( isset( $data->image ) ) {
            $this->checkFile( $data->image, $results );
        }

        // TODO: tiles
        // TODO: overlays

        return $result;
    }
}
