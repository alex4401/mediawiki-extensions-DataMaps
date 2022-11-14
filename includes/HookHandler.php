<?php
namespace MediaWiki\Extension\Ark\DataMaps;

use MediaWiki\Extension\Ark\DataMaps\Content\VisualMapEditPage;
use MediaWiki\MediaWikiServices;
use RequestContext;
use Title;
use PageProps;

class HookHandler implements
    \MediaWiki\Hook\ParserFirstCallInitHook,
    \MediaWiki\Revision\Hook\ContentHandlerDefaultModelForHook,
    \MediaWiki\Hook\CanonicalNamespacesHook,
    \MediaWiki\Preferences\Hook\GetPreferencesHook,
    \MediaWiki\Hook\SkinTemplateNavigation__UniversalHook,
    \MediaWiki\Hook\CustomEditorHook,
    \MediaWiki\Hook\ParserOptionsRegisterHook,
    \MediaWiki\ChangeTags\Hook\ChangeTagsListActiveHook,
    \MediaWiki\ChangeTags\Hook\ListDefinedTagsHook,
    \MediaWiki\Hook\RecentChange_saveHook
{
    public static function onRegistration(): bool {
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
        return true;
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

    public function onParserOptionsRegister( &$defaults, &$inCacheKey, &$lazyLoad ) {
        $defaults['isMapVisualEditor'] = false;
    }

    public function onListDefinedTags( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
    }

    public function onChangeTagsListActive( &$tags ) {
        $tags[] = 'datamaps-visualeditor';
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
        } else if ( self::canUseVE( $skinTemplate->getAuthority()->getUser(), $title ) ) {
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
            $editor = new VisualMapEditPage( $article );
            $editor->setContextTitle( $title );
            $editor->edit();
            return false;
        }
        return true;
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
}
