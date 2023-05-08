module.exports = {
    /**
     * @template TObjectType
     * @template {keyof TObjectType} TKey
     * @param {TObjectType} obj
     * @param {TKey} key
     * @param {TObjectType[ TKey ]} defaultValue
     * @param {boolean} [writeDefault=true]
     * @return {NonNullable< TObjectType[ TKey ] >}
     */
    getOrDefault( obj, key, defaultValue, writeDefault ) {
        if ( writeDefault !== false ) {
            if ( obj[ key ] === undefined ) {
                obj[ key ] = defaultValue;
            }
            return /** @type {NonNullable<TObjectType[ TKey ]>} */ ( obj[ key ] );
        } else {
            if ( obj[ key ] === undefined ) {
                return /** @type {NonNullable<TObjectType[ TKey ]>} */ ( defaultValue );
            }
            return /** @type {NonNullable<TObjectType[ TKey ]>} */ ( obj[ key ] );
        }
    }
};
