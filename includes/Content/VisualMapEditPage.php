<?php
namespace MediaWiki\Extension\Ark\DataMaps\Content;

use DeferredUpdates;
use EditPage;
use MediaWiki\MediaWikiServices;
use MediaWiki\Permissions\PermissionManager;
use ParserOptions;

class VisualMapEditPage {
    public function edit() {
		$permErrors = $this->permManager->getPermissionErrors(
			'edit',
			$this->getUserForPermissions(),
			$this->mTitle,
			PermissionManager::RIGOR_FULL
		);
        if ( $permErrors ) {
            if ( $this->context->getUser()->getBlock() ) {
                // Auto-block user's IP if the account was "hard" blocked
                if ( !MediaWikiServices::getInstance()->getReadOnlyMode()->isReadOnly() ) {
                    DeferredUpdates::addCallableUpdate( function () {
                        $this->context->getUser()->spreadAnyEditBlock();
                    } );
                }
            }
            // TODO: this is a private MW 1.39 method
            $this->displayPermissionsError( $permErrors );
            return;
        }

        $revRecord = $this->mArticle->fetchRevisionRecord();

        $out = $this->context->getOutput();

        // Enable article-related sidebar, toplinks, etc.
        $out->setArticleRelated( true );

        $contextTitle = $this->getContextTitle();
        $out->setPageTitle( $this->context->msg( $contextTitle->exists() ? 'editing' : 'creating',
            $contextTitle->getPrefixedText() ) );

        // Show applicable editing introductions
        if ( $this->formtype == 'initial' ) {
            $this->showIntro();
        }

        $out->addModules( [
            'ext.datamaps.ve'
        ] );

        $dummy = MediaWikiServices::getInstance()->getContentHandlerFactory()
            ->getContentHandler( ARK_CONTENT_MODEL_DATAMAP )
            ->makeEmptyContent();
        $content = $this->getContentObject( $dummy );

        $parser = MediaWikiServices::getInstance()->getParser();
        $parserOptions = ParserOptions::newFromAnon();
        $parserOptions->setIsPreview( true );
        $parserOptions->setOption( 'isMapVisualEditor', true );
        $parser->setOptions( $parserOptions );

        $parserOutput = $content->getParserOutput( $this->mTitle, null, $parserOptions );
        $parserOutput = MediaWikiServices::getInstance()->getContentRenderer()->getParserOutput( $content, $this->mTitle,
            null, $parserOptions );

        $out->addParserOutputMetadata( $parserOutput );
        $out->addHTML( $parserOutput->getText( [] ) );
    }
}
