<?php
use MediaWiki\MediaWikiServices;

class DataMapEmbedRenderer {
    protected Title $title;
    public object $data;

    public function __construct( Title $title, object $data ) {
        $this->title = $title;
        $this->data = $data;
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    private function getImageUrl(): string {
		$file = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $this->data->image ) );
		//if ( $file && $file->exists() ) {
		return $file->getURL();
    }

    public function getJsConfigVariables(): array {
        return [
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),
            'image' => $this->getImageUrl(),
        ];
    }

    public function getModules(): array {
        return array('ext.ark.datamaps.leaflet.core', 'ext.ark.datamaps.leaflet.loader');
    }

    public function getHtml(): string {
		return Html::rawElement(
			'div',
			[
				'id' => 'datamap-' . $this->getId(),
				'class' => 'datamap'
			],
            Html::element(
                'noscript',
                null,
                wfMessage( 'datamap-javascript-disabled' )
            )
            . Html::element(
				'div',
				[
					'class' => 'datamap-status'
				],
				wfMessage( 'datamap-placeholder-loading' )
			)
		);
    }
}