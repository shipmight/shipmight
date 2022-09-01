![Shipmight header image](https://raw.githubusercontent.com/shipmight/shipmight/master/readme-header-image.png)

[Home](https://shipmight.com)     [Docs](https://shipmight.com/docs)     [GitHub](https://github.com/shipmight)     [Twitter](https://twitter.com/shipmight)

## Installation

See [Docs → Installation](https://shipmight.com/docs/installation).

TL;DR:

```bash
helm repo add shipmight https://shipmight.github.io/helm-charts
helm repo update
helm install shipmight shipmight/shipmight-stack \
  --namespace shipmight \
  --create-namespace
```

## Documentation

Browse HTML documentation at [shipmight.com/docs](https://shipmight.com/docs).

You can also browse the raw Markdown files under the directory [`docs/`](docs/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Released under GNU AGPLv3, see [LICENSE](LICENSE).

It is a permissive open source license. Paraphrased, it allows you to use the software freely as long as you don't make a modified or derivative work available to others (including over a network), unless that work is also released publicly under the same license.

Paraphrased and not exhaustive (see license text for exact terms), you are allowed to:

- Use the software for commercial and non-commercial purposes
- Maintain a private and modified fork for your own private use

Paraphrased and not exhaustive (see license text for exact terms), you are not allowed to:

- Maintain a private and modified fork for use by others
- Maintain a private and modified fork for use by others over a network
