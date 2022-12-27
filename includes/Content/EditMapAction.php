<?php
namespace MediaWiki\Extension\DataMaps\Content;

use FormlessAction;
use MediaWiki\Extension\DataMaps\HookHandler;
use MediaWiki\MediaWikiServices;
use MediaWiki\Permissions\PermissionManager;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use ParserOptions;
use ParserOutput;
use User;

class EditMapAction extends FormlessAction {
    /**
     * @return string
     */
    public function getName() {
        return 'editmap';
    }

    /**
     * @return string|null
     */
    public function onView() {
        return null;
    }

    protected function checkCanExecute( User $user ) {
        parent::checkCanExecute( $user );

        if ( !HookHandler::canUseVE( $user, $this->getArticle()->getTitle() ) ) {
            // TODO: throw an exception, wrong page or map ineligible for VE edits
        }
    }

    public function show() {
        $this->useTransactionalTimeLimit();

        $req = $this->getRequest();
        $article = $this->getArticle();
        $user = $this->getAuthority()->getUser();
        $out = $this->getOutput();
        $out->setRobotPolicy( 'noindex,nofollow' );

        // The editor should always see the latest content when starting their edit.
        // Also to ensure cookie blocks can be set (T152462).
        $out->disableClientCache();

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
        /** @var DataMapContent */
        $content = $article->fetchRevisionRecord()->getContent( SlotRecord::MAIN, RevisionRecord::FOR_THIS_USER,
            $this->getAuthority() );

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
    }

    public function doesWrites() {
        return true;
    }
}
