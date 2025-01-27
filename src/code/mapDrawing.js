var markdown = require( "markdown" ).markdown;
import UiCommands from "./uiCommands.js";
import {getColorHex} from "./markerDialog";
import {checkAllLinks} from "./crosslinks";
import distance from "./arc";

var Wasabee = window.plugin.Wasabee;

//** This function draws things on the layers */
export const drawThings = () => {
    window.plugin.wasabee.resetAllPortals();
    resetAllTargets();
    resetAllLinks();
    checkAllLinks();
};

//** This function adds all the Targets to the layer */
const addAllTargets = () => {
    var targetList = window.plugin.wasabee.getSelectedOperation().markers;
    if (targetList != null) {
        targetList.forEach((target) => addTarget(target));
    }
};

//** This function resets all the Targets and calls addAllTargets to add them */
const resetAllTargets = () => {
    for (var guid in window.plugin.wasabee.targetLayers) {
        var targetInLayer = window.plugin.wasabee.targetLayers[guid];
        window.plugin.wasabee.targetLayerGroup.removeLayer(targetInLayer);
        delete window.plugin.wasabee.targetLayers[guid];
    }
    addAllTargets();
};

/** This function adds a Targets to the target layer group */
const addTarget = (target) => {
    var targetPortal = window.plugin.wasabee.getSelectedOperation().getPortal(target.portalId)
    var latLng = new L.LatLng(targetPortal.lat, targetPortal.lng);
    var marker = L.marker(latLng, {
        title: targetPortal.name,
        icon: L.icon({
            iconUrl: getImageFromMarkerType(target.type),
            shadowUrl: null,
            iconSize: L.point(25, 41),
            iconAnchor: L.point(25, 41),
            popupAnchor: L.point(-1, -48)
        })
    });

    window.registerMarkerForOMS(marker);
    marker.bindPopup(getMarkerPopup(marker, target, targetPortal));
    marker.off("click", marker.togglePopup, marker);
    marker.on("spiderfiedclick", marker.togglePopup, marker);
    window.plugin.wasabee.targetLayers[target["ID"]] = marker;
    marker.addTo(window.plugin.wasabee.targetLayerGroup);
};

const getMarkerPopup = (marker, target, portal) => {
    marker.className = "wasabee-dialog wasabee-dialog-ops"
    var content = document.createElement("div");
    var title = content.appendChild(document.createElement("div"));
    title.className = "desc";
    title.innerHTML = markdown.toHTML(getPopupBodyWithType(portal, target));
    var buttonSet = content.appendChild(document.createElement("div"));
    buttonSet.className = "temp-op-dialog";
    var deleteButton = buttonSet.appendChild(document.createElement("a"));
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
        UiCommands.deleteMarker(window.plugin.wasabee.getSelectedOperation(), target, portal)
        marker.closePopup();
    }, false);
    return content;
};

export const getPopupBodyWithType = (portal, target) => {
    var title = ""
    var comment = target.comment;
    switch (target.type) {
        case Wasabee.Constants.MARKER_TYPE_DESTROY:
            title = "Destroy";
            break;
        case Wasabee.Constants.MARKER_TYPE_DECAY:
            title = "Let Decay";
            break;
        case Wasabee.Constants.MARKER_TYPE_VIRUS:
            title = "Virus";
            break;
        default:
            title = "Unknown";
    }
    title = title + " - " + portal.name;
    if (!comment) { return title; }
    else { return title + "\n\n" + comment; }
};

//** This function returns the appropriate image for a marker type */
const getImageFromMarkerType = (type) => {
    switch (type) {
        case Wasabee.Constants.MARKER_TYPE_VIRUS:
            return Wasabee.static.images.marker_alert_virus;
        case Wasabee.Constants.MARKER_TYPE_DESTROY:
            return Wasabee.static.images.marker_alert_destroy;
        case Wasabee.Constants.MARKER_TYPE_DECAY:
            return Wasabee.static.images.marker_alert_decay;
        default:
            return Wasabee.static.images.marker_alert_unknown;
    }
};

//** This function adds all the Links to the layer */
const addAllLinks = () => {
    var operation = window.plugin.wasabee.getSelectedOperation()
    var linkList = operation.links;
    linkList.forEach((link) => addLink(link, operation.color, operation));
};

//** This function resets all the Links and calls addAllLinks to add them */
const resetAllLinks = () => {
    for (var guid in window.plugin.wasabee.linkLayers) {
        var linkInLayer = window.plugin.wasabee.linkLayers[guid];
        window.plugin.wasabee.linkLayerGroup.removeLayer(linkInLayer);
        delete window.plugin.wasabee.linkLayers[guid];
    }
    addAllLinks();
};

/** This function adds a portal to the portal layer group */
const addLink = (link, color, operation) => {
    var color = getColorHex(color);
    var options = {
        dashArray: [5, 5, 1, 5],
        color: color ? color : "#ff6600",
        opacity: 1,
        weight: 2
    };
    var latLngs = link.getLatLngs(operation);
    if (latLngs != null) {
        var fromPortal = operation.getPortal(link.fromPortalId)
        var toPortal = operation.getPortal(link.toPortalId)
        var startCoord = new window.plugin.wasabee.arc.Coord(latLngs[0].lng, latLngs[0].lat);
        var endCoord = new window.plugin.wasabee.arc.Coord(latLngs[1].lng, latLngs[1].lat);
        var gc = new window.plugin.wasabee.arc.GreatCircle(startCoord, endCoord);
        var geojson_feature = gc.Arc(Math.round(distance(fromPortal, toPortal))).json();

        var link_ = new L.geoJson(geojson_feature, options);

        window.plugin.wasabee.linkLayers[link["ID"]] = link_;
        link_.addTo(window.plugin.wasabee.linkLayerGroup);
    } else { console.log("LATLNGS WAS NULL?!") }
}
