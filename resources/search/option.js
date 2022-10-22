function MenuOptionWidget( config ) {
	MenuOptionWidget.super.call( this, config );

    this.keywords = config.keywords;
    this.$tab = config.$tab;

    if ( config.badge ) {
        this.$badge = $( '<span class="datamap-search-badge">' )
            .text( config.badge )
            .prependTo( this.$label );
        if ( config.badgeCurrent ) {
            this.$badge.addClass( 'current' );
        }
    }

    if ( config.icon ) {
        this.$arkIcon = $( '<img width=16 height=16 />' )
            .attr( {
                src: config.icon.options.iconUrl
            } )
            .prependTo( this.$label );
    }
}
OO.inheritClass( MenuOptionWidget, OO.ui.MenuOptionWidget );


module.exports = MenuOptionWidget;
