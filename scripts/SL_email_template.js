function main( req, res ) {

    if ( req.getMethod() == 'GET' ) {
        var so_id = req.getParameter( 'soid' );
        var form = nlapiCreateForm("Please enter the number of items you wish to remove from the order then press SUBMIT", false);
        form.setScript("customscript500");
        form.addButton("custpage_submit", "SUBMIT", "request(" + so_id + ")");
        form.addButton("custpage_cancel", "CANCEL", "cancel('https://system.sandbox.netsuite.com" + nlapiResolveURL('RECORD', 'salesorder', so_id) + "')");

        var so_rec = nlapiLoadRecord( 'salesorder', so_id );
        var lineitemcount = so_rec.getLineItemCount( 'item' );
        var style = 'table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%;}td, th {border: 1px solid #dfdfdf;text-align: left; padding: 8px;}th { background-color: #dfdfdf;}';
        var html = '<table class="tbl"><thead><tr><th>Item</th ><th>Description</th><th>Quantity</th><th>Delete Request Qty</th></tr></thead><tbody>';
        for ( var i = 1; i <= lineitemcount; i++ ) {
            var row = '<tr>';
            row += '<td>' + so_rec.getLineItemText( 'item', 'item', i ) + '</td>';
            row += '<td>' + so_rec.getLineItemValue( 'item', 'description', i ) + '</td>';
            row += '<td>' + so_rec.getLineItemValue( 'item', 'quantity', i ) + '</td>';
            row += '<td><input type="text" data-id="' + i + '" value="" style="width:30px"></td>';
            row += '</tr>';
            html += row;
        }
        html += '</tbody></table>';
    
        var fld = form.addField('custpage_html', 'inlinehtml', "", null);
        fld.setDefaultValue(html);
        fld.setLayoutType('outsidebelow','startrow');

        var inline_style = [ "<style>", "table {", "font-size: 13px; width:100%; font-family: arial, sans-serif; border-collapse: collapse; width: 100%;", "}", "td, th " + "border: 1px solid #dfdfdf;text-align: left; padding: 8px;" + "}", "th { font-size:14px; font-weight:bold;background-color: #dfdfdf;}", "</style>" ].join("");
        form.addField("custpage_style", "inlinehtml").setDefaultValue(inline_style);
        res.writePage(form);
    } else {
        var data = JSON.parse(req.getParameter('data'));
        var id   = req.getParameter('id');
        var rec = nlapiLoadRecord('salesorder', id);
        for ( var i = 0; i < data.length; i++) {
            var line = data[i];
            var linenumber = line.linenumber;
            var value      = line.value;
            rec.setLineItemValue('item', 'custcol_delete_request',linenumber, value );
        }
        id = nlapiSubmitRecord(rec);
        nlapiSetRedirectURL('RECORD','salesorder',id, false);
    }

}
