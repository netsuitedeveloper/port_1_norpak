/**
 * Module Description : Item Fulfillment Merge
 *
 * Version    Date            Author			Email					Skype
 * 1.00       29 Feb 2016     Hakuna Moni	hakunamoni@gmail.com	hakunamoni
 *
 */

/***************************************
 This Module (UserEvent, ClientScript, Suitelet scripts) is generating a custom form with a sublist that consists of 
 Item Fulfillment records in which the user can check off which records to merge into a single item fulfillment. 
 A PDF is then created after the user presses "Merge" that is identical to a Bill of Lading form.
****************************************/

//UserEvent Script
function beforeLoad(type, form) {
  try {
    //////////////////////////////////
    //	Create "Item Fulfillment Merger" Button
    //	When the Type is "View" Mode, ShipStatus is "Picked"/"Packed", Also If there is any available record to merge.
    //////////////////////////////////

    if (type == "view") {
      var if_id = nlapiGetRecordId();
      nlapiLogExecution("DEBUG", "if_id", if_id);

      //		var if_fields = ['status','trandate','shipaddress'] ;
      //		var if_values = nlapiLookupField('itemfulfillment', if_id, if_fields);

      //		var shipstatus = if_values.status;
      //		var trandate = if_values.trandate;
      //		var shipaddr = if_values.shipaddress;

      var shipstatus = nlapiLookupField("itemfulfillment", if_id, "status"); //shipstatus
      var trandate = nlapiLookupField("itemfulfillment", if_id, "trandate");
      var shipaddr = nlapiLookupField("itemfulfillment", if_id, "shipaddress");

      nlapiLogExecution("DEBUG", "shipstatus", shipstatus);
      nlapiLogExecution("DEBUG", "trandate", trandate);
      nlapiLogExecution("DEBUG", "shipaddr", shipaddr);

      if (shipstatus == "picked" || shipstatus == "packed") {
        var filters = [];
        filters.push(new nlobjSearchFilter("type", null, "anyOf", "ItemShip"));
        filters.push(
          new nlobjSearchFilter("status", null, "anyOf", [
            "ItemShip:A",
            "ItemShip:B",
          ])
        );
        filters.push(new nlobjSearchFilter("mainline", null, "is", "T"));
        filters.push(
          new nlobjSearchFilter("internalidnumber", null, "notequalto", if_id)
        );
        if (trandate != null) {
          filters.push(new nlobjSearchFilter("trandate", null, "on", trandate));
        }
        if (shipaddr != null) {
          ship_str = shipaddr.split(" ");
          ship_str.forEach(function (str) {
            filters.push(
              new nlobjSearchFilter("shipaddress", null, "contains", str)
            );
          });
        }

        var columns = [];
        columns.push(new nlobjSearchColumn("internalid"));

        var rs = nlapiSearchRecord("itemfulfillment", null, filters, columns);

        if (rs) {
          form.addButton(
            "custpage_itemfulfillment",
            "Item Fulfillment Merger",
            "buttonhandleCL"
          );
          form.setScript("customscript_cl_item_fulfillment_merger");
        }
      }
    }
  } catch (error) {
    if (error.getDetails != undefined) {
      nlapiLogExecution(
        "error",
        "Process Error",
        error.getCode() + ": " + error.getDetails()
      );
    } else {
      nlapiLogExecution("error", "Unexpected Error", error.toString());
    }
  }
  nlapiLogExecution("DEBUG", "Exit Log", "Exit Script Successfully.");
}

//Client Script
function buttonhandleCL() {
  //////////////////////////////////
  //	create URL for suitelet using parameters
  //	calls script itemFulMerger.js
  //////////////////////////////////
  try {
    var suiteletURL = nlapiResolveURL(
      "SUITELET",
      "customscript_sl_if_merge_form",
      "customdeploy_sl_if_merge_form"
    );
    suiteletURL += "&custparam_recid=" + nlapiGetRecordId();
    nlapiLogExecution("DEBUG", "suiteletURL", suiteletURL);

    window.open(suiteletURL);
  } catch (error) {
    if (error.getDetails != undefined) {
      nlapiLogExecution(
        "error",
        "Process Error",
        error.getCode() + ": " + error.getDetails()
      );
    } else {
      nlapiLogExecution("error", "Unexpected Error", error.toString());
    }
  }
  nlapiLogExecution("DEBUG", "Exit Log", "Exit Script Successfully.");
}

//SuiteLet Script

var LIST_ID = "custpage_sublist_ifsimilar";
var FULFILLMENT_IDS = [];
var FILE_ID = "71016";
var FOLDER_ID = "40431";
var TRAN_ID = ""; //'M';
var HAS_CUSTOMER_CODE = false;

function suitelet(request, reponse) {
  var form, sublist;

  nlapiLogExecution("DEBUG", "Start Log", "Start Script Successfully");

  if (request.getMethod() == "GET") {
    var recId = request.getParameter("custparam_recid");
    nlapiLogExecution("DEBUG", "Record ID", recId);

    var recIF = nlapiLoadRecord("itemfulfillment", recId);

    var trandate = recIF.getFieldValue("trandate");
    var shipaddr = recIF.getFieldValue("shipaddress");

    nlapiLogExecution("DEBUG", "Trandate", trandate);
    nlapiLogExecution("DEBUG", "ShipAddress", shipaddr);

    //////////////////////////////////
    //	Create Form
    //////////////////////////////////

    form = nlapiCreateForm("Item Fulfillment Merger", false);
    var sublist = form.addSubList(
      LIST_ID,
      "list",
      "Item Fulfillments",
      "custom"
    );

    var filters = [];
    filters.push(new nlobjSearchFilter("type", null, "anyOf", "ItemShip"));
    filters.push(
      new nlobjSearchFilter("status", null, "anyOf", [
        "ItemShip:A",
        "ItemShip:B",
      ])
    );
    filters.push(new nlobjSearchFilter("mainline", null, "is", "T"));
    if (trandate != null) {
      filters.push(new nlobjSearchFilter("trandate", null, "on", trandate));
    }
    if (shipaddr != null) {
      ship_str = shipaddr.split(" ");
      ship_str.forEach(function (str) {
        filters.push(
          new nlobjSearchFilter("shipaddress", null, "contains", str)
        );
      });
    }

    var columns = [];
    columns.push(new nlobjSearchColumn("trandate"));
    columns.push(new nlobjSearchColumn("internalid"));
    columns.push(new nlobjSearchColumn("internalid", "customer"));
    columns.push(new nlobjSearchColumn("shipaddress"));
    columns.push(new nlobjSearchColumn("custbody_promisedate", "createdfrom"));
    columns.push(new nlobjSearchColumn("custbody_shipmentweight"));

    //columns[0].setSort();

    var if_result = nlapiSearchRecord(
      "itemfulfillment",
      null,
      filters,
      columns
    );
    nlapiLogExecution("DEBUG", "if_result", if_result.length);

    sublist.addField("custpage_selected", "checkbox", "Selected");
    sublist.addField("custpage_no", "text", "No");
    sublist.addField("custpage_view", "text", "Transaction");
    sublist.addField("trandate", "date", "Date");
    sublist.addField("custpage_if", "text", "Transaction Number");
    sublist.addField("custpage_customer", "text", "Customer");
    sublist.addField("shipaddress", "text", "Shipping Address");
    sublist.addField("custbody_promisedate", "date", "Promise Date");
    sublist.addField("custbody_shipmentweight", "float", "Shipment Weight");
    sublist.setLineItemValues(if_result);
    sublist.addMarkAllButtons();

    if (if_result) {
      for (var i = 0; i < if_result.length; i++) {
        var if_id = if_result[i].getValue(columns[1]);
        var cust_id = if_result[i].getValue(columns[2]);
        var promisedate = if_result[i].getValue(columns[4]);

        var if_rec = nlapiLoadRecord("itemfulfillment", recId);
        var cust_label = if_rec.getFieldText("entity");
        var if_label = if_rec.getFieldValue("tranid");

        var if_link = nlapiResolveURL("RECORD", "itemfulfillment", if_id);
        var cust_link = nlapiResolveURL("RECORD", "customer", cust_id);

        view_link =
          '<a style="color:#0000CC; text-decoration: none;" href="' +
          if_link +
          '">' +
          "view" +
          "</a>";
        if_link =
          '<a style="color:#0000CC; text-decoration: none;" href="' +
          if_link +
          '">' +
          String(if_label) +
          "</a>";
        cust_link =
          '<a style="color:#0000CC; text-decoration: none;" href="' +
          cust_link +
          '">' +
          String(cust_label) +
          "</a>";

        sublist.setLineItemValue("custpage_view", i + 1, view_link);
        //				sublist.setLineItemValue('custpage_if',i+1,if_link);
        sublist.setLineItemValue("custpage_if", i + 1, String(if_label));
        sublist.setLineItemValue("custpage_customer", i + 1, cust_link);
        sublist.setLineItemValue("custbody_promisedate", i + 1, promisedate);
        sublist.setLineItemValue("custpage_no", i + 1, String(i + 1));
      }
    }

    form.addSubmitButton("Merge");
    form.addResetButton("Reset");

    response.writePage(form);
  } else {
    //////////////////////////////////
    //	Get Array of Line Items Information to be Merged
    //////////////////////////////////

    var Item_array = new Array();
    var Item_index = 0;

    var customer_item_label = 6;
    var itemTable = "";

    var TOTAL_sum = 0;
    var WEIGHT_sum = 0;

    for (var i = 1; i <= request.getLineItemCount(LIST_ID); i++) {
      if (request.getLineItemValue(LIST_ID, "custpage_selected", i) == "T") {
        if_id_str = request.getLineItemValue(LIST_ID, "custpage_view", i);
        var key = "id=";
        if_id_str = if_id_str.slice(
          if_id_str.indexOf(key) + key.length,
          if_id_str.length
        );
        if_id = if_id_str.slice(0, if_id_str.indexOf('"'));
        nlapiLogExecution("DEBUG", "FULFILL ID " + i, if_id);

        FULFILLMENT_IDS.push(if_id);

        var recIF = nlapiLoadRecord("itemfulfillment", if_id);

        if (TRAN_ID) {
          TRAN_ID = TRAN_ID + "-" + recIF.getFieldValue("tranid");
        } else {
          TRAN_ID = recIF.getFieldValue("tranid");
        }

        var so_id = recIF.getFieldValue("createdfrom");
        nlapiLogExecution("DEBUG", "so_id", so_id);

        var recSO = nlapiLoadRecord("salesorder", so_id);

        var po_id = recSO.getFieldValue("otherrefnum");
        nlapiLogExecution("DEBUG", "po_id", po_id);

        var item_count = recIF.getLineItemCount("item");
        nlapiLogExecution("DEBUG", "item_count", item_count);

        for (var x = 1; x <= item_count; x++) {
          Item_array[Item_index] = new Array();

          Item_array[Item_index][0] = so_id;
          Item_array[Item_index][1] = po_id;

          recIF.selectLineItem("item", x);

          Item_array[Item_index][2] = recIF.getCurrentLineItemText(
            "item",
            "item"
          );
          Item_array[Item_index][3] = recIF.getCurrentLineItemValue(
            "item",
            "description"
          );
          Item_array[Item_index][4] = recIF.getCurrentLineItemValue(
            "item",
            "quantity"
          );
          Item_array[Item_index][5] = recIF.getCurrentLineItemValue(
            "item",
            "custcol_customeritemcode"
          );

          recSO.selectLineItem("item", x);

          Item_array[Item_index][6] = recSO.getCurrentLineItemValue(
            "item",
            "quantity"
          );
          Item_array[Item_index][7] =
            recSO.getCurrentLineItemValue("item", "quantity") -
            recSO.getCurrentLineItemValue("item", "quantityfulfilled") -
            Item_array[Item_index][4];

          nlapiLogExecution("DEBUG", "Line Item " + x, Item_array[Item_index]);

          if (
            recIF.getCurrentLineItemValue("item", "custcol_customeritemcode") !=
            ""
          ) {
            HAS_CUSTOMER_CODE = true;
            customer_item_label = 12;
          }

          TOTAL_sum = TOTAL_sum + parseFloat(Item_array[Item_index][4]);
          Item_index++;
        }

        var weight = recIF.getFieldValue("custbody_shipmentweight");
        WEIGHT_sum = WEIGHT_sum + parseFloat(weight);
      }
    }

    //		nlapiLogExecution('DEBUG','Item Array',Item_array);
    nlapiLogExecution("DEBUG", "TRAN_ID", TRAN_ID);
    nlapiLogExecution("DEBUG", "FULFILLMENT IDS", FULFILLMENT_IDS);

    if (FULFILLMENT_IDS.length > 0) {
      //////////////////////////////////
      //	Item Table Html Complete
      //////////////////////////////////

      for (var i = 0; i < Item_array.length; i++) {
        if (i % 2 == 0) {
          itemTable += "<tr>";
        } else {
          itemTable += '<tr class="alt_row">';
        }

        if (HAS_CUSTOMER_CODE == true) {
          itemTable +=
            '<td colspan="' +
            customer_item_label +
            '"><span class="itemname">' +
            Item_array[i][5] +
            "</span> - " +
            Item_array[i][2] +
            "</td>";
        } else {
          itemTable +=
            '<td colspan="' +
            customer_item_label +
            '"><span class="itemname">' +
            Item_array[i][2] +
            "</span></td>";
        }

        itemTable += '<td colspan="8">' + Item_array[i][3] + "</td>";
        itemTable +=
          '<td align="right" colspan="4">' + Item_array[i][6] + "</td>";

        if (Item_array[i][7] > 0) {
          itemTable +=
            '<td align="right" colspan="4">' + Item_array[i][7] + "</td>";
        } else {
          itemTable += '<td align="right" colspan="4">0</td>';
        }

        itemTable +=
          '<td align="right" colspan="4" class="big_shipped">' +
          Item_array[i][4] +
          "</td>";
        itemTable +=
          '<td align="right" colspan="6">' + Item_array[i][1] + "</td>";
        itemTable +=
          '<td align="right" colspan="4">' + Item_array[i][0] + "</td>";
        itemTable += "</tr>";

        if (i >= 21 && i % 21 == 0) {
          itemTable += "</table></div>";
          itemTable += '<#if pageBackground == 1><div class="driver">';
          itemTable += '<#elseif pageBackground == 2><div class="customer">';
          itemTable += '<#else /><div class="packList">';
          itemTable += "</#if>";
          itemTable +=
            '<table class="itemtable" style="width: 100%; margin-top: 10px;">';
          itemTable += "<thead>";
          itemTable += "	<tr> ";
          itemTable +=
            '	<th colspan="' +
            customer_item_label +
            '"><!--${record.item[0].itemname@label}-->Item</th>';
          itemTable +=
            '	<th colspan="8"><!--${record.item[0].description@label}-->Description</th>';
          itemTable += '	<th align="right" colspan="4">Ordered</th>';
          itemTable +=
            '	<th align="right" colspan="4"><!--${salesorder.item[0].quantitybackordered@label}-->Back Ordered</th>';
          itemTable +=
            '	<th align="right" colspan="4" class="big_shipped">Shipped</th>';
          itemTable +=
            '	<th align="right" colspan="6" class="big_shipped">Customer PO #</th>';
          itemTable +=
            '	<th align="right" colspan="4" class="big_shipped">Sales Order</th>';
          itemTable += "	</tr>";
          itemTable += "</thead>";
        }
      }

      itemTable += "</table>";

      //////////////////////////////////
      //	Get Neccessary Information including company info, etc.
      //////////////////////////////////

      var companyInfo = nlapiLoadConfiguration("companyinformation"); //Load company information
      var logoUrl =
        "https://system.sandbox.netsuite.com/core/media/media.nl?id=53791&amp;c=3828377&amp;h=7e9923b58319e80560d4"; //		var logoUrl = companyInfo.getFieldValue('pagelogo');
      var encoded_logoUrl = encodeURI(logoUrl);

      var companyName = companyInfo.getFieldValue("companyname");
      var mainaddress_text = companyInfo.getFieldValue("mainaddress_text");
      var fax = companyInfo.getFieldValue("fax");
      var company_url = companyInfo.getFieldValue("url");

      nlapiLogExecution("DEBUG", "logoUrl", logoUrl);
      nlapiLogExecution("DEBUG", "companyName", companyName);
      nlapiLogExecution("DEBUG", "mainaddress_text", mainaddress_text);
      nlapiLogExecution("DEBUG", "fax", fax);
      nlapiLogExecution("DEBUG", "company_url", company_url);

      nlapiLogExecution("DEBUG", "WEIGHT_sum", WEIGHT_sum);
      nlapiLogExecution("DEBUG", "TOTAL_sum", TOTAL_sum);

      var record_IF = nlapiLoadRecord("itemfulfillment", FULFILLMENT_IDS[0]);

      var so_id = record_IF.getFieldValue("createdfrom");
      nlapiLogExecution("DEBUG", "so_id", so_id);

      var recSO = nlapiLoadRecord("salesorder", so_id);

      var shipaddress = recSO.getFieldValue("shipaddress");
      nlapiLogExecution("DEBUG", "shipaddress", shipaddress);

      var memo = recSO.getFieldValue("memo");
      nlapiLogExecution("DEBUG", "memo", memo);

      var linkedtrackingnumbers = recSO.getFieldValue("linkedtrackingnumbers");
      nlapiLogExecution(
        "DEBUG",
        "linkedtrackingnumbers",
        linkedtrackingnumbers
      );

      //////////////////////////////////
      //	Build HTML
      //////////////////////////////////

      var html = nlapiLoadFile(FILE_ID);
      var html_src = html.getValue();

      html_src = html_src.replace("{{logoUrl}}", encoded_logoUrl);
      html_src = html_src.replace("{{companyName}}", companyName);
      html_src = html_src.replace("{{mainaddress_text}}", mainaddress_text);
      html_src = html_src.replace("{{fax}}", fax);
      html_src = html_src.replace("{{company_url}}", company_url);
      html_src = html_src.replace("{{TRAN_ID}}", TRAN_ID);
      html_src = html_src.replace("{{TRAN_ID_}}", TRAN_ID);

      html_src = html_src.replace("{{shipaddress}}", shipaddress);
      html_src = html_src.replace("{{memo}}", memo);
      html_src = html_src.replace(
        "{{linkedtrackingnumbers}}",
        linkedtrackingnumbers
      );
      html_src = html_src.replace(
        "{{linkedtrackingnumbers_}}",
        linkedtrackingnumbers
      );
      html_src = html_src.replace(
        "{{linkedtrackingnumbers__}}",
        linkedtrackingnumbers
      );
      html_src = html_src.replace(
        "{{customer_item_label}}",
        customer_item_label
      );

      html_src = html_src.replace("{{itemTable}}", itemTable);

      html_src = html_src.replace("{{WEIGHT_sum}}", WEIGHT_sum);
      html_src = html_src.replace("{{TOTAL_sum}}", TOTAL_sum);

      //////////////////////////////////
      //	Generate PDF
      //////////////////////////////////

      var xml = html_src;

      // Save the template as an XML instead of a PDF
      var myXMLTemplatefile = nlapiCreateFile("myXMLfile.xml", "XMLDOC", xml);
      myXMLTemplatefile.setFolder(FOLDER_ID);
      var myXMLTemplatefileID = nlapiSubmitFile(myXMLTemplatefile);
      nlapiLogExecution("DEBUG", "myXMLTemplatefileID", myXMLTemplatefileID);

      //Load the XML File, set a record for sourcing, and then call nlapiXMLToPDF to create the PDF File

      var renderer = nlapiCreateTemplateRenderer();

      var myXMLFile = nlapiLoadFile(myXMLTemplatefileID);
      var myXMLFile_value = myXMLFile.getValue();
      renderer.setTemplate(myXMLFile_value);
      nlapiLogExecution("DEBUG", "myXMLFile_value", myXMLFile_value);

      renderer.addRecord("record", record_IF);
      nlapiLogExecution("DEBUG", "renderer", renderer);

      var xmlRendered = renderer.renderToString();
      //		nlapiLogExecution("DEBUG","xmlRendered", xmlRendered);

      var file = nlapiXMLToPDF(xmlRendered);
      // run the BFO library to convert the xml document to a PDF
      nlapiLogExecution("DEBUG", "file", file);

      // set content type, file name, and content-disposition (inline means display in browser)
      response.setContentType("PDF", "Ful_" + TRAN_ID + ".pdf", "inline");

      // write response to the client
      response.write(file.getValue());
    } else {
      nlapiLogExecution(
        "DEBUG",
        "Exit Log",
        "Exit Script Error - FULFILLMENT_IDS length = 0."
      );
    }
  }

  nlapiLogExecution("DEBUG", "Exit Log", "Exit Script Successfully.");
}
