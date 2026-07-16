import React, { useEffect, useState } from 'react';
import { mappls } from 'mappls-web-maps';

const mapplsClassObject = new mappls();

export default function TestMap() {
    useEffect(() => {
        mapplsClassObject.initialize("hklmgbwzrxncdyavtsuojqpiefrbhqplnm", { map: true, version: '3.0' }, () => {
            console.log("Init callback");
            const map = mapplsClassObject.Map({
                id: "test-map",
                properties: { center: [28.6139, 77.2090], zoom: 10 }
            });
            console.log("Map created", map);
        });
    }, []);

    return <div id="test-map" style={{ width: 800, height: 600, background: 'red' }}></div>;
}
