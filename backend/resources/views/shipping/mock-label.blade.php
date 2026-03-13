<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Shipping Label {{ $order->order_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f3f6fb;
            color: #10275c;
            margin: 0;
            padding: 24px;
        }
        .label {
            max-width: 720px;
            margin: 0 auto;
            background: #fff;
            border: 2px solid #10275c;
            padding: 28px;
        }
        .row {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
        }
        .box {
            flex: 1;
            border: 1px solid #cad4e4;
            padding: 16px;
            min-height: 110px;
        }
        .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }
        .meta-item {
            border: 1px solid #cad4e4;
            padding: 12px;
        }
        .label-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #6e7a92;
            margin-bottom: 8px;
        }
        .barcode {
            margin-top: 24px;
            padding: 18px;
            border: 1px dashed #10275c;
            text-align: center;
            font-size: 28px;
            letter-spacing: 0.15em;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="label">
        <h1 style="margin: 0 0 24px;">Mock {{ $provider ?? 'Shipping' }} Label</h1>
        <div class="meta">
            <div class="meta-item">
                <div class="label-title">Order</div>
                <strong>{{ $order->order_number }}</strong>
            </div>
            <div class="meta-item">
                <div class="label-title">Shipment ID</div>
                <strong>{{ $shipmentId }}</strong>
            </div>
            <div class="meta-item">
                <div class="label-title">Carrier</div>
                <strong>{{ $carrier }}</strong>
            </div>
            <div class="meta-item">
                <div class="label-title">Service</div>
                <strong>{{ $service }}</strong>
            </div>
        </div>

        <div class="row">
            <div class="box">
                <div class="label-title">From</div>
                @foreach ($fromAddress as $line)
                    @if ($line)
                        <div>{{ $line }}</div>
                    @endif
                @endforeach
            </div>
            <div class="box">
                <div class="label-title">To</div>
                @foreach ($toAddress as $line)
                    @if ($line)
                        <div>{{ $line }}</div>
                    @endif
                @endforeach
            </div>
        </div>

        <div class="barcode">{{ $trackingNumber }}</div>
    </div>
</body>
</html>
