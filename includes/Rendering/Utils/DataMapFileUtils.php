<?php
namespace Ark\DataMaps\Rendering\Utils;

use MediaWiki\MediaWikiServices;
use InvalidArgumentException;

class DataMapFileUtils {
    public static function getFile( string $title, int $width = -1 ) {
        return MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $title ) );
    }

    public static function getRequiredFile( string $title, int $width = -1 ) {
        $title = trim( $title );

        $file = MediaWikiServices::getInstance()->getRepoGroup()->findFile( $title );
        if ( !$file || !$file->exists() ) {
            throw new InvalidArgumentException( "File [[File:$title]] does not exist." );
        }

        if ( $width > 0 ) {
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