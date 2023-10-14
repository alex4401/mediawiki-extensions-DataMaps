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
use Parser;
use RequestContext;
use Title;
use User;

// @phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

final class HookHandler implements
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
    /** @var ExtensionConfig */
    private ExtensionConfig $config;

    /**
     * @param ExtensionConfig $config
     */
    public function __construct( ExtensionConfig $config ) {
        $this->config = $config;
    }

    public static function onRegistration(): bool {
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

    /**
     * Registers Map namespace if configured so (default behaviour). Sets the robot policy if namespace ID is 2900.
     *
     * @param string[] &$namespaces
     * @return void
     */
    public function onCanonicalNamespaces( &$namespaces ) {
        if ( $this->config->isNamespaceManaged() ) {
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
        if ( $this->config->getNamespaceId() === 2900 && !isset( $wgNamespaceRobotPolicies[2900] ) ) {
            $wgNamespaceRobotPolicies[2900] = 'noindex,follow';
        }
    }

    /**
     * Registers parser functions when a parser is initialised.
     *
     * @param Parser $parser
     * @return void
     */
    public function onParserFirstCallInit( $parser ) {
        $parser->setFunctionHook(
            'displaydatamap', [ ParserFunctions\EmbedMapFunction::class, 'run' ],
            Parser::SFH_NO_HASH | Parser::SFH_OBJECT_ARGS
        );
        if ( $this->config->isTransclusionAliasEnabled() ) {
            $parser->setFunctionHook(
                'displaydatamap_short', [ ParserFunctions\EmbedMapFunction::class, 'run' ],
                Parser::SFH_NO_HASH | Parser::SFH_OBJECT_ARGS
            );
        }
        $parser->setFunctionHook(
            'datamaplink', [ ParserFunctions\MapLinkFunction::class, 'run' ],
            Parser::SFH_OBJECT_ARGS
        );
    }

    private static function isDocPage( Title $title ) {
        $docPage = wfMessage( 'datamap-doc-page-suffix' )->inContentLanguage();
        return !$docPage->isDisabled() && str_ends_with( $title->getPrefixedText(), $docPage->plain() );
    }

    /**
     * Promotes map content model as default for pages in the Map namespace, optionally checking if the title prefix is
     * satisfied.
     *
     * @param Title $title
     * @param string &$model
     * @return void
     */
    public function onContentHandlerDefaultModelFor( $title, &$model ) {
        if ( $title->getNamespace() === $this->config->getNamespaceId() && !self::isDocPage( $title ) ) {
            $prefix = wfMessage( 'datamap-standard-title-prefix' )->inContentLanguage();
            if ( $prefix !== '-' && str_starts_with( $title->getText(), $prefix->plain() ) ) {
                $model = CONTENT_MODEL_DATAMAPS;
            }
        }

        return true;
    }

    /**
     * Informs Extension:CodeEditor that map pages should use JSON highlighting.
     *
     * @param Title $title
     * @param string &$languageCode
     * @return void
     */
    public static function onCodeEditorGetPageLanguage( Title $title, &$languageCode ) {
        if ( $title->hasContentModel( CONTENT_MODEL_DATAMAPS ) ) {
            $languageCode = 'json';
        }

        return true;
    }

    /**
     * Defines our tags.
     *
     * @param string[] &$tags
     * @return void
     */
    public function onListDefinedTags( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    /**
     * Registers our currently used tags.
     *
     * @param string[] &$tags
     * @return void
     */
    public function onChangeTagsListActive( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    /**
     * Adds the "edited with visual map editor" tag to edits done over API [likely] by our visual editor.
     *
     * @param RecentChange $rc The new RC entry.
     * @return void
     */
    public function onRecentChange_save( $rc ) {
        $request = RequestContext::getMain()->getRequest();
        if ( $request->getBool( 'isdatamapsve' ) ) {
            $rc->addTags( 'datamaps-visualeditor' );
        }
    }

    /**
     * Returns available user preferences related to the visual editor.
     *
     * @param User $user
     * @param array &$preferences
     * @return void
     */
    public function onGetPreferences( $user, &$preferences ) {
        if ( $this->config->isVisualEditorEnabled() ) {
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
        $config = MediaWikiServices::getInstance()->get( ExtensionConfig::SERVICE_NAME );

        return $config->isVisualEditorEnabled()
            && $title->getNamespace() === $config->getNamespaceId()
            && $title->hasContentModel( CONTENT_MODEL_DATAMAPS )
            && $title->exists()
            && ( $user === null || $prefsLookup->getBoolOption( $user, Constants::PREFERENCE_ENABLE_VE ) )
            && count( $pageProps->getProperties( $title, Constants::PAGEPROP_DISABLE_VE ) ) <= 0;
    }

    private function canCreateMapWithGui( Title $title ): bool {
        return $this->config->isCreateMapEnabled()
            && $title->getNamespace() === $this->config->getNamespaceId()
            && $title->hasContentModel( CONTENT_MODEL_DATAMAPS )
            && !$title->exists();
    }

    /**
     * Configures article navigation links for maps:
     *
     * - Non-existent maps that can be created: "Create Map" wizard lazy-loader is scheduled;
     * - Existing maps that can be edited: the "Edit" link is hijacked to use the visual editor.
     *
     * @param SkinTemplate $skinTemplate
     * @param array &$links
     * @return void
     */
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

    /**
     * On maps, expands ParserOutput's metadata to include markers, as a way of deferring parsing those markers. This
     * is expensive as many parse calls will be invoked.
     *
     * @param Title $title
     * @param RenderedRevision $renderedRevision
     * @param DeferrableUpdate[] &$updates
     * @return void
     */
    public function onRevisionDataUpdates( $title, $renderedRevision, &$updates ) {
        if ( $this->config->shouldLinksUpdatesUseMarkers()
            && $title->getNamespace() === $this->config->getNamespaceId()
            && $title->hasContentModel( CONTENT_MODEL_DATAMAPS ) ) {
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
                    $budget = $this->config->getLinksUpdateBudget();
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
        $extConfig = MediaWikiServices::getInstance()->get( ExtensionConfig::SERVICE_NAME );
        return [
            'IsBleedingEdge' => $extConfig->hasExperimentalFeatures(),
            'IsVisualEditorEnabled' => $extConfig->isVisualEditorEnabled(),
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
