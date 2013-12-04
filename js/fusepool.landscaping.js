/* JSlint hints: */
/*globals _,$ */

/**
 * FusePool namespace.
 *
 * This is the global namespace under which we place the Landscaping part. If
 * FusePool is not yet defined (or otherwise evaluated to false) we will make
 * an empty object.
 *
 * @type {*|{}}
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
var FusePool = FusePool || {};

/**
 * FusePool.Landscaping namespace.
 *
 * It is the API to and contains all code regarding the client side landscaping
 * visualization support.
 *
 * It is assumed that jQuery is available when this script is included.
 *
 * @type {{}}
 * @author: Daniël van Adrichem <daniel@treparel.com>
 */
FusePool.Landscaping = {
    /**
     * Initialize the Landscape component.
     *
     * The node found using the given selector will be the container where the landscape
     * will be added to.
     *
     * @param selector
     * @author: Daniël van Adrichem <daniel@treparel.com>
     */
    initialize: function (selector) {
        console.log("Initializing FusePool.Landscaping");
        this.$container = $(selector);
    }
};
