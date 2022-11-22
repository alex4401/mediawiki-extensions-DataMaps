<?php
namespace MediaWiki\Extension\DataMaps\Rendering\Utils;

use InvalidArgumentException;
use MediaWiki\MediaWikiServices;
use ParserOutput;

class DataMapFileUtils {
    public const SCALING_WIDTH_THRESHOLD = 64;

    protected static function cleanName( string $title ): string {
        if ( str_starts_with( strtolower( $title ), 'file:' ) ) {
            $title = substr( $title, 5 );
        }
        return trim( $title );
    }

    public static function getFile( string $title ) {
        return MediaWikiServices::getInstance()->getRepoGroup()->findFile( self::cleanName( $title ) );
    }

    public static function getRequiredFile( string $title, int $width = -1 ) {
        $title = self::cleanName( $title );
        $file = self::getFile( $title );
        if ( !$file || !$file->exists() ) {
            throw new InvalidArgumentException( "[[File:$title]] does not exist." );
        }

        if ( $width > 0 && $file->getWidth() > self::SCALING_WIDTH_THRESHOLD
            && !str_ends_with( strtolower( $title ), '.svg' ) ) {
            $file = $file->transform( [
                'width' => $width
            ] );
        }

        return $file;
    }

    public static function getFileUrl( string $title, int $width = -1 ): string {
        return self::getRequiredFile( $title, $width )->getURL();
    }

    public static function registerImageDependency( ParserOutput $parserOutput, string $name ): void {
        $file = self::getRequiredFile( $name );
        $parserOutput->addImage( $file->getTitle()->getDBkey(), $file->getTimestamp(), $file->getSha1() );
    }
}
