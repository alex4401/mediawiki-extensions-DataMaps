<?php
namespace MediaWiki\Extension\DataMaps;

use Config;
use ExtensionRegistry;
use MediaWiki\Extension\DataMaps\Content\DataMapContent;
use MediaWiki\Extension\DataMaps\Migration\Fandom\FandomMapContentHandler;
use MediaWiki\Extension\DataMaps\Rendering\MarkerProcessor;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use RequestContext;
use Title;
use User;

class HookHandler implements
    \MediaWiki\Hook\ParserFirstCallInitHook,
    \MediaWiki\Revision\Hook\ContentHandlerDefaultModelForHook,
    \MediaWiki\Hook\CanonicalNamespacesHook,
    \MediaWiki\Preferences\Hook\GetPreferencesHook,
    \MediaWiki\Hook\SkinTemplateNavigation__UniversalHook,
    \MediaWiki\ChangeTags\Hook\ChangeTagsListActiveHook,
    \MediaWiki\ChangeTags\Hook\ListDefinedTagsHook,
    \MediaWiki\Hook\RecentChange_saveHook,
    \MediaWiki\Storage\Hook\RevisionDataUpdatesHook
{
    public static function onRegistration(): bool {
        /** @deprecated v0.16.1, will be removed in v1.0. Use CONTENT_MODEL_DATAMAPS */
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
        define( 'CONTENT_MODEL_DATAMAPS', 'datamap' );
        define( 'CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT', 'interactivemap' );

        global $wgContentHandlers, $wgDataMapsNamespaceId, $wgDataMapsEnableFandomPortingTools;
        if ( $wgDataMapsEnableFandomPortingTools && $wgDataMapsNamespaceId === 2900 ) {
            $wgContentHandlers[CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT] = FandomMapContentHandler::class;
        }

        return true;
    }

    private static function ideConstantsFromExtensionJson() {
        define( 'NS_MAP', 2900 );
        define( 'NS_MAP_TALK', 2901 );
    }

    public function onCanonicalNamespaces( &$namespaces ) {
        if ( ExtensionConfig::isNamespaceManaged() ) {
            $namespaces[NS_MAP] = 'Map';
            $namespaces[NS_MAP_TALK] = 'Map_talk';
        }

        // If our default namespace ID is used (because some earlier wiki.gg DataMaps deployments had to define their own
        // namespace as we didn't manage any back then) set the robot policy to disallow indexing if it hasn't been specified by
        // local sysadmins.
        //
        // Articles should embed the maps as needed, as that is the most likely target for map usage anyway. Source pages should
        // not compete.
        global $wgNamespaceRobotPolicies;
        if ( ExtensionConfig::getNamespaceId() === 2900 && !isset( $wgNamespaceRobotPolicies[2900] ) ) {
            $wgNamespaceRobotPolicies[2900] = 'noindex,follow';
        }
    }

    public function onParserFirstCallInit( $parser ) {
        $parser->setFunctionHook(
            'displaydatamap', [ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
            SFH_NO_HASH
        );
        if ( ExtensionConfig::isTransclusionAliasEnabled() ) {
            $parser->setFunctionHook(
                'displaydatamap_short', [ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
                SFH_NO_HASH
            );
        }
        $parser->setFunctionHook(
            'datamaplink', [ ParserFunctions\MapLinkFunction::class, 'run' ],
            SFH_OBJECT_ARGS
        );
    }

    private static function isDocPage( Title $title ) {
        $docPage = wfMessage( 'datamap-doc-page-suffix' )->inContentLanguage();
        return !$docPage->isDisabled() && str_ends_with( $title->getPrefixedText(), $docPage->plain() );
    }

    public function onContentHandlerDefaultModelFor( $title, &$model ) {
        if ( $title->getNamespace() === ExtensionConfig::getNamespaceId() && !self::isDocPage( $title ) ) {
            $prefix = wfMessage( 'datamap-standard-title-prefix' )->inContentLanguage();
            if ( $prefix !== '-' && str_starts_with( $title->getText(), $prefix->plain() ) ) {
                $model = ARK_CONTENT_MODEL_DATAMAP;
            }
        }
        return true;
    }

    public static function onCodeEditorGetPageLanguage( Title $title, &$languageCode ) {
        if ( $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP ) ) {
            $languageCode = 'json';
        }
        return true;
    }

    public function onListDefinedTags( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    public function onChangeTagsListActive( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    public function onChangeTagsAllowedAdd( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    /**
     * @param RecentChange $rc The new RC entry.
     */
    public function onRecentChange_save( $rc ) {
        $request = RequestContext::getMain()->getRequest();
        if ( $request->getBool( 'isdatamapsve' ) ) {
            $rc->addTags( 'datamaps-visualeditor' );
        }
    }

    public function onGetPreferences( $user, &$preferences ) {
        if ( ExtensionConfig::isVisualEditorEnabled() ) {
            $preferences[Constants::PREFERENCE_ENABLE_VE__FUTURE] = [
                'type' => 'toggle',
                'label-message' => 'datamap-userpref-enable-ve',
                'section' => 'editing/editor'
            ];
            $preferences[Constants::PREFERENCE_ENABLE_VE] = [
                'type' => 'toggle',
                'label-message' => 'datamap-userpref-enable-ve-beta',
                'section' => 'editing/editor'
            ];
        }
    }

    /**
     * @internal
     */
    public static function canUseVE( ?User $user, Title $title ): bool {
        $prefsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
        $pageProps = MediaWikiServices::getInstance()->getPageProps();

        return ExtensionConfig::isVisualEditorEnabled()
            && $title->getNamespace() === ExtensionConfig::getNamespaceId()
            && $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP )
            && $title->exists()
            && ( $user === null || $prefsLookup->getBoolOption( $user, Constants::PREFERENCE_ENABLE_VE ) )
            && count( $pageProps->getProperties( $title, Constants::PAGEPROP_DISABLE_VE ) ) <= 0;
    }

    private function canCreateMapWithGui( Title $title ): bool {
        return ExtensionConfig::isCreateMapEnabled()
            && $title->getNamespace() === ExtensionConfig::getNamespaceId()
            && $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP )
            && !$title->exists();
    }

    public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
        if ( !isset( $links['views']['edit'] ) ) {
            return;
        }

        $title = $skinTemplate->getRelevantTitle();

        // If this page does not exist yet and we can use the visual map creation workflow, offer it.
        //
        // Otherwise if the page exists, the instance has visual editor enabled, and the user is opted into it, inject
        // the visual=1 query parameter into the "Edit" link, and add an "Edit source" link right after it.
        if ( self::canCreateMapWithGui( $title ) ) {
            $skinTemplate->getOutput()->addModules( [
                'ext.datamaps.createMapLazy'
            ] );
        } elseif ( self::canUseVE( $skinTemplate->getAuthority()->getUser(), $title ) ) {
            $links['views']['edit']['href'] = $title->getLocalURL( [ 'action' => 'editmap' ] + $skinTemplate->editUrlOptions() );
            $links['views'] = array_slice( $links['views'], 0, 2, true ) + [
                'editsource' => [
                    'text' => wfMessage( 'datamap-ve-edit-source-action' )->text(),
                    'href' => $title->getLocalURL( $skinTemplate->editUrlOptions() )
                ]
            ] + array_slice( $links['views'], 2, null, true );
        }
    }

    public function onRevisionDataUpdates( $title, $renderedRevision, &$updates ) {
        if ( ExtensionConfig::shouldLinksUpdatesUseMarkers()
            && $title->getNamespace() === ExtensionConfig::getNamespaceId()
            && $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP ) ) {
            foreach ( $updates as &$updater ) {
                if ( $updater instanceof \MediaWiki\Deferred\LinksUpdate\LinksUpdate ) {
                    $parserOutput = $updater->getParserOutput();
                    $revision = $renderedRevision->getRevision();
                    $content = $revision->getContent( SlotRecord::MAIN, RevisionRecord::FOR_PUBLIC, null );
                    // Cast content to a data model
                    $dataMap = $content->asModel();
                    // Prepare a parser
                    $parser = MediaWikiServices::getInstance()->getParser();
                    $parserOptions = \ParserOptions::newFromAnon();
                    $parser->setOptions( $parserOptions );
                    $parser->parse( '', $title, $parserOptions, false, true );
                    // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
                    // creating thousands of small, very short-lived (only one at a time) objects
                    $marker = new Data\MarkerSpec( new \stdclass() );
                    // The budget controls remaining time we may spend on parsing wikitext in the markers
                    $budget = ExtensionConfig::getLinksUpdateBudget();
                    $startTime = microtime( true );

                    $dataMap->iterateRawMarkerMap( static function ( string $_, array $rawCollection )
                        use ( &$parser, &$title, &$parserOptions, &$marker, &$budget, &$startTime ) {
                        // Parse labels and descriptions of each marker, and drop the text. We only care about the metadata here.
                        foreach ( $rawCollection as &$rawMarker ) {
                            $marker->reassignTo( $rawMarker );
                            if ( $marker->getLabel() !== null
                                && MarkerProcessor::shouldParseString( $marker, $marker->getLabel() ) ) {
                                $parser->parse( $marker->getLabel(), $title, $parserOptions, false, false );
                            }
                            if ( $marker->getDescription() !== null
                                && MarkerProcessor::shouldParseString( $marker, $marker->getDescription() ) ) {
                                $parser->parse( $marker->getDescription(), $title, $parserOptions, false, false );
                            }
                            $parser->getOutput()->setText( '' );

                            // Subtract the budget and stop iteration 
                            $budget -= microtime( true ) - $startTime;
                            if ( $budget <= 0 ) {
                                return false;
                            }
                        }
                    } );

                    // Merge the metadata gathered after parsing all the markers
                    $parserOutput->mergeTrackingMetaDataFrom( $parser->getOutput() );
                    break;
                }
            }
        }
    }

    public static function getJsConfig( \MediaWiki\ResourceLoader\Context $context, Config $config ): array {
        return [
            'IsBleedingEdge' => ExtensionConfig::isBleedingEdge(),
            'IsVisualEditorEnabled' => ExtensionConfig::isVisualEditorEnabled(),
            'TabberNeueModule' =>
                ExtensionRegistry::getInstance()->isLoaded( 'TabberNeue', '>= 1.8.0' )
                    ? ( $config->get( 'TabberNeueUseCodex' ) ? 'ext.tabberNeue.codex' : 'ext.tabberNeue.legacy' )
                    : 'ext.tabberNeue',
            // TODO: not the brightest way
            'CanAnonsEdit' => array_key_exists( 'edit', $config->get( MainConfigNames::GroupPermissions )[ '*' ] )
        ];
    }

    public static function getCreateMapConfig( \MediaWiki\ResourceLoader\Context $context, Config $config ): array {
        return [
            'PREFERRED_SCHEMA_VERSION' => DataMapContent::PREFERRED_SCHEMA_VERSION
        ];
    }
}
