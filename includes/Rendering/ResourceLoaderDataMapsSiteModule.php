<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use MediaWiki\ResourceLoader\Context;
use MediaWiki\ResourceLoader\WikiModule;

class ResourceLoaderDataMapsSiteModule extends WikiModule {
    protected $targets = [ 'desktop', 'mobile' ];

    protected function getPages( Context $context ): array {
        $pages = [];
        if ( $this->getConfig()->get( 'UseSiteJs' ) ) {
            $pages['MediaWiki:DataMaps.js'] = [ 'type' => 'script' ];
        }
        if ( $this->getConfig()->get( 'UseSiteCss' ) ) {
            $pages['MediaWiki:DataMaps.css'] = [ 'type' => 'style' ];
        }
        return $pages;
    }
}
