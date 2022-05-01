<?php
use MediaWiki\MediaWikiServices;

class DataMapEmbedRenderer {
    protected Title $title;
    public object $data;
    protected File $image;

    public function __construct( Title $title, object $data ) {
        $this->title = $title;
        $this->data = $data;
		$this->image = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $this->data->image ) );
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    private function getImageUrl(): string {
		//if ( $file && $file->exists() ) {
		return $this->image->getURL();
    }

    public function getJsConfigVariables(): array {
        return [
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),
            'image' => $this->getImageUrl(),
            'imageBounds' => [ $this->image->getWidth(), $this->image->getHeight() ],
            'coordinateBounds' => $this->data->coordinateBounds,
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