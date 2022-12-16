<?php
namespace MediaWiki\Extension\DataMaps;

use MediaWiki\Extension\DataMaps\Rendering\MarkerProcessor;
use MediaWiki\MediaWikiServices;
use MediaWiki\Permissions\PermissionManager;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use ParserOptions;
use ParserOutput;
use RequestContext;
use Title;
use User;

class HookHandler implements
    \MediaWiki\Hook\ParserFirstCallInitHook,
    \MediaWiki\Revision\Hook\ContentHandlerDefaultModelForHook,
    \MediaWiki\Hook\CanonicalNamespacesHook,
    \MediaWiki\Preferences\Hook\GetPreferencesHook,
    \MediaWiki\Hook\SkinTemplateNavigation__UniversalHook,
    \MediaWiki\Hook\CustomEditorHook,
    \MediaWiki\ChangeTags\Hook\ChangeTagsListActiveHook,
    \MediaWiki\ChangeTags\Hook\ListDefinedTagsHook,
    \MediaWiki\Hook\RecentChange_saveHook,
    \MediaWiki\Storage\Hook\RevisionDataUpdatesHook
{
    public static function onRegistration(): bool {
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
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
    }

    public function onParserFirstCallInit( $parser ) {
        $parser->setFunctionHook(
            'pf-embed-data-map', [ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
            SFH_NO_HASH
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
            $preferences['datamaps-enable-visual-editor'] = [
                'type' => 'toggle',
                'label-message' => 'datamap-userpref-enable-ve',
                'section' => 'editing/editor'
            ];
            $preferences['datamaps-opt-in-visual-editor-beta'] = [
                'type' => 'toggle',
                'label-message' => 'datamap-userpref-enable-ve-beta',
                'section' => 'editing/editor'
            ];
        }
    }

    private function canUseVE( User $user, Title $title ): bool {
        $prefsLookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
        $pageProps = MediaWikiServices::getInstance()->getPageProps();

        return ExtensionConfig::isVisualEditorEnabled()
            && $title->getNamespace() === ExtensionConfig::getNamespaceId()
            && $title->hasContentModel( ARK_CONTENT_MODEL_DATAMAP )
            && $prefsLookup->getOption( $user, /*datamaps-enable-visual-editor*/ 'datamaps-opt-in-visual-editor-beta' )
            && $title->exists()
            && count( $pageProps->getProperties( $title, 'ext.datamaps.isIneligibleForVE' ) ) <= 0;
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
            $links['views']['edit']['href'] = $title->getLocalURL( $skinTemplate->editUrlOptions() + [
                'visual' => 1
            ] );
            $injection = [
                'editsource' => [
                    'text' => wfMessage( 'datamap-ve-edit-source-action' )->text(),
                    'href' => $title->getLocalURL( $skinTemplate->editUrlOptions() )
                ]
            ];
            $links['views'] = array_slice( $links['views'], 0, 2, true ) + $injection +
                array_slice( $links['views'], 2, null, true );
        }
    }

    public function onCustomEditor( $article, $user ) {
        if ( RequestContext::getMain()->getRequest()->getBool( 'visual' ) && self::canUseVE( $user, $article->getTitle() ) ) {
            $req = $article->getContext()->getRequest();
            $out = $article->getContext()->getOutput();

            // Check if the user can edit this page, and resort back to source editor (which should display the errors and
            // a source view) if they can't.
            $permErrors = MediaWikiServices::getInstance()->getPermissionManager()
                ->getPermissionErrors( 'edit', $user, $article->getTitle(), PermissionManager::RIGOR_FULL );
            if ( $permErrors ) {
                return true;
            }

            // Set up page title and revision ID
            $out->setPageTitle( wfMessage( 'editing', $article->getTitle()->getPrefixedText() ) );
            $out->setRevisionId( $req->getInt( 'oldid', $article->getRevIdFetched() ) );

            // Fetch the content object
            /** @var Content\DataMapContent */
            $content = $article->fetchRevisionRecord()->getContent( SlotRecord::MAIN, RevisionRecord::FOR_THIS_USER, $user );

            // Ensure this is not a mix-in
            if ( $content->isMixin() ) {
                $out->addWikiMsg( 'datamap-ve-cannot-edit-mixins' );
                $out->addWikiMsg( 'datamap-ve-needs-fallback-to-source'/*, $sourceUrl*/ );
                return false;
            }

            // Run validation as the visual editor cannot handle source-level errors
            $status = $content->getValidationStatus();
            if ( !$status->isOk() ) {
                $out->addWikiMsg( 'datamap-ve-cannot-edit-validation-errors', $status->getMessage( false, false ) );
                return false;
            }

            // Render a placeholder message for the editor
            $out->addWikiMsg( 'datamap-ve-to-load' );

            // Render an empty embed with no markers
            $parserOptions = ParserOptions::newFromAnon();
            $parserOptions->setIsPreview( true );
            $parser = MediaWikiServices::getInstance()->getParser();
            $parser->setOptions( $parserOptions );
            $parserOutput = new ParserOutput();

            // Get an embed renderer
            $embedRenderer = $content->getEmbedRenderer( $article->getTitle(), $parser, $parserOutput, [
                've' => true
            ] );

            // Render a marker-less embed
            $embedRenderer->prepareOutput();
            $out->addParserOutputMetadata( $parserOutput );
            $out->addHTML( $embedRenderer->getHtml() );

            // Inject the JavaScript module
            $out->addModules( [
                'ext.datamaps.ve'
            ] );

            return false;
        }
        return true;
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
}
