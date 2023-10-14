<?php
namespace MediaWiki\Extension\DataMaps\ParserFunctions;

use PPFrame;
use PPNode;

final class CommonUtilities {
    /**
     * Wraps text as a commonly recognised wikitext error pattern.
     *
     * @param string $text
     * @return array
     */
    public static function wrapError( string $text ): array {
        return [
            "<strong class=\"error\">$text</strong>",
            'noparse' => true,
            'isHTML' => true
        ];
    }

    /**
     * Expands all argument nodes and parses named parameters.
     *
     * @param PPFrame $frame
     * @param PPNode[] $argNodes
     * @param ?array $defaults
     * @return array
     */
    public static function getArguments( PPFrame $frame, array $argNodes, ?array $defaults = null ) {
        $expanded = $defaults ?? [];

        foreach ( $argNodes as $argNode ) {
            $arg = $frame->expand( $argNode );

            $pair = explode( '=', $arg, 2 );
            if ( count( $pair ) === 2 ) {
                $pair = array_map( 'trim', $pair );
                $expanded[$pair[0]] = $pair[1];
            } else {
                $expanded[] = $arg;
            }
        }

        return $expanded;
    }
}
