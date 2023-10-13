<?php
namespace MediaWiki\Extension\DataMaps\ParserFunctions;

use MediaWiki\MediaWikiServices;
use Parser;
use PPNode;
use PPFrame;
use Title;

final class MapLinkFunction {
    /**
     * {{#MapLink:Location maps#Arbury-0|marker=100}}
     *
     * @param Parser $parser
     * @param PPFrame $frame
     * @param PPNode[] $args
     * @return string
     */
    public static function run( Parser $parser, PPFrame $frame, array $args ): array {
        $linkRenderer = MediaWikiServices::getInstance()->getLinkRenderer();

        $expandedArgs = [];
        foreach ( $args as $argNode ) {
            $arg = $frame->expand( $argNode );

            $pair = explode( '=', $arg, 2 );
            if ( count( $pair ) === 2 ) {
                $pair = array_map( 'trim', $pair );
                $expandedArgs[$pair[0]] = $pair[1];
            } else {
                $expandedArgs[] = $arg;
            }
        }

        $target = Title::newFromText( $expandedArgs[0] );

        return [
            $linkRenderer->makeLink(
                $target,
                $expandedArgs[1] ?? null,
                [],
                [
                    'marker' => $expandedArgs['marker'] ?? null
                ]
            ),
            'noparse' => true,
            'isHTML' => true
        ];
    }
}
