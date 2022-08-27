<?php
namespace MediaWiki\Extension\Ark\DataMaps\Rendering\Utils;

use MediaWiki\MediaWikiServices;
use InvalidArgumentException;

class DataMapFileUtils {
    const SCALING_WIDTH_THRESHOLD = 64;

    public static function getFile( string $title ) {
        if ( str_starts_with( strtolower( $title ), 'file:' ) ) {
            $title = substr( $title, 5 );
        } 
        return MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $title ) );
    }

    public static function getRequiredFile( string $title, int $width = -1 ) {
        $title = trim( $title );

        $file = self::getFile( $title );
        if ( !$file || !$file->exists() ) {
            throw new InvalidArgumentException( "File [[File:$title]] does not exist." );
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
}