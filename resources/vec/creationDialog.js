const Enums = require( '../loader/enums.js' );


function CreationDialog( config ) {
	OO.ui.ProcessDialog.call( this, config );
}
OO.inheritClass( CreationDialog, OO.ui.ProcessDialog );


CreationDialog.static.name = 'mveCreationDialog';
CreationDialog.static.title = mw.msg( 'datamap-vec-title' );
CreationDialog.static.actions = [
	{
        modes: [ 'create' ],
		label: mw.msg( 'datamap-ve-cancel' ),
		flags: [ 'safe', 'close' ]
	}
];


CreationDialog.prototype.initialize = function () {
	OO.ui.ProcessDialog.prototype.initialize.apply( this, arguments );
	
    this.originSelector = new OO.ui.DropdownInputWidget( {
        options: [
            { data: Enums.CRSOrigin.TopLeft, label: mw.msg( 'datamap-vec-crs-top-left' ) },
            { data: Enums.CRSOrigin.BottomLeft, label: mw.msg( 'datamap-vec-crs-bottom-left' ) }
        ]
    } );
    this.crsSelector = new OO.ui.DropdownInputWidget( {
        options: [
            { data: 0, label: mw.msg( 'datamap-vec-crs-image' ) },
            { data: 1, label: mw.msg( 'datamap-vec-crs-percent' ) },
            { data: 2, label: mw.msg( 'datamap-vec-crs-custom' ) }
        ]
    } );
    this.imageSelector = new mw.widgets.TitleInputWidget( {
        namespace: 6
    } );
    this.coordsToggle = new OO.ui.ToggleSwitchWidget( {
        value: true
    } );
    this.zoomToggle = new OO.ui.ToggleSwitchWidget( {
        value: true
    } );
    this.searchToggle = new OO.ui.ToggleSwitchWidget( {
        value: false
    } );
    this.tabberSearchToggle = new OO.ui.ToggleSwitchWidget( {
        value: false,
        disabled: true
    } );
    this.requireUIDsToggle = new OO.ui.ToggleSwitchWidget( {
        value: false
    } );
    this.prefill = new OO.ui.HiddenInputWidget( {
        name: 'wpTextbox1'
    } );
    this.submitButton = new OO.ui.ButtonInputWidget( {
        label: mw.msg( 'datamap-vec-submit' ),
        flags: [ 'primary', 'progressive' ],
        useInputTag: true,
        type: 'submit'
    } );

    this.panel = new OO.ui.PanelLayout( {
        framed: false,
        expanded: false,
        padded: true,
        classes: [ 'datamap-vec' ],
        content: [
            $( '<p>' ).text( mw.msg( 'datamap-vec-intro' ) ),
            new OO.ui.FormLayout( {
                action: mw.util.getUrl( mw.config.get( 'wgPageName' ), {
                    action: 'edit'
                } ),
                method: 'POST',
                items: [
                    new OO.ui.FieldsetLayout( {
                        items: [
                            new OO.ui.FieldLayout( this.originSelector, {
                                label: mw.msg( 'datamap-vec-select-crs-origin' ),
                                align: 'left'
                            } ),
                            new OO.ui.FieldLayout( this.crsSelector, {
                                label: mw.msg( 'datamap-vec-select-crs' ),
                                align: 'left'
                            } ),
                            new OO.ui.PanelLayout( {
                                expanded: false,
                                classes: [ 'hidden' ]
                            } ),
                            new OO.ui.FieldLayout( this.imageSelector, {
                                label: mw.msg( 'datamap-vec-select-background' ),
                                align: 'left'
                            } ),
                            new OO.ui.PanelLayout( {
                                framed: true,
                                padded: true,
                                expanded: false,
                                classes: [ 'datamap-collapsible' ],
                                content: [
                                    $( '<input type="checkbox" />' ),
                                    new OO.ui.LabelWidget( {
                                        label: mw.msg( 'datamap-vec-extra-options' )
                                    } ),
                                    new OO.ui.IndicatorWidget( {
                                        indicator: 'up'
                                    } ),
                                    new OO.ui.PanelLayout( {
                                        expanded: false,
                                        content: [
                                            new OO.ui.FieldLayout( this.zoomToggle, {
                                                label: mw.msg( 'datamap-vec-toggle-zoom' ),
                                                align: 'left'
                                            } ),
                                            new OO.ui.FieldLayout( this.coordsToggle, {
                                                label: mw.msg( 'datamap-vec-toggle-coord-display' ),
                                                align: 'left'
                                            } ),
                                            new OO.ui.FieldLayout( this.searchToggle, {
                                                label: mw.msg( 'datamap-vec-toggle-search' ),
                                                align: 'left'
                                            } ),
                                            new OO.ui.FieldLayout( this.tabberSearchToggle, {
                                                label: mw.msg( 'datamap-vec-toggle-search-tabber' ),
                                                align: 'left'
                                            } ),
                                            new OO.ui.FieldLayout( this.requireUIDsToggle, {
                                                label: mw.msg( 'datamap-vec-toggle-uid-requirement' ),
                                                align: 'left'
                                            } )
                                        ]
                                    } )
                                ]
                            } ),
                            this.prefill,
                            new OO.ui.FieldLayout( this.submitButton )
                        ]
                    } )
                ]
            } )
        ]
    } );

    this.searchToggle.on( 'change', () => {
        this.tabberSearchToggle.setDisabled( !this.searchToggle.getValue() );
    } );

    this.submitButton.on( 'click', this.updatePrefillValue, null, this );

    this.$body.append( this.panel.$element );
};


// Set up the initial mode of the window ('edit', in this example.)  
CreationDialog.prototype.getSetupProcess = function ( data ) {
	return OO.ui.ProcessDialog.prototype.getSetupProcess.call( this, data )
	    .next( () => this.actions.setMode( 'create' ), this );
};


CreationDialog.prototype.updatePrefillValue = function () {
    const imageSize = [ 100, 100 ];

    const out = {
        crs: [ [ 0, 0 ], imageSize ],
        image: this.imageSelector.getValue()
    };

    if ( this.originSelector.getValue() === Enums.CRSOrigin.BottomLeft ) {
        out.crs = [ out.crs[1], out.crs[0] ];
    }

    // TODO: this should check against default feature sets
    if ( !this.coordsToggle.getValue() ) {
        out.showCoordinates = false;
    }

    if ( !this.zoomToggle.getValue() ) {
        out.disableZoom = true;
    }

    if ( this.searchToggle.getValue() ) {
        out.enableSearch = true;

        if ( this.tabberSearchToggle.getValue() ) {
            out.enableSearch = 'tabberWide';
        }
    }

    if ( this.requireUIDsToggle.getValue() ) {
        out.requireCustomMarkerIDs = true;
    }

    out.groups = {};
    out.markers = {};
    this.prefill.$element.attr( 'value', JSON.stringify( out ) );

    this.submitButton.$button.submit();
};


module.exports = CreationDialog;